import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import type { ToastState } from './Toast';

const TERRAIN_PREFERENCES_KEY = 'terrain_preferences';

interface TerrainConfig {
  chunkSize: number;
  segments: number;
  renderDistance: number;
  overlap: number;
  updateThreshold: number;
  heightScale: number;
  noiseScale: number;
  fogNear: number;
  fogFar: number;
  cameraHeight: number;
  cameraDistance: number;
  moveSpeed: THREE.Vector3;
  initialChunks: number;
  chunkGenerationBatchSize: number;
  wireframe: boolean;
  wireframeOpacity: number;
  antialias: boolean;
  pixelRatio: number;
  terrainColor: string;
}

interface QualityPreset {
  segments: number;
  renderDistance: number;
  antialias: boolean;
  pixelRatio: number;
}

interface TerrainBackgroundProps {
  onLoad?: () => void;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  onToast?: (message: string, variant?: ToastState['variant']) => void;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  chunkSize: 30,
  segments: 30,
  renderDistance: 2,
  overlap: 1,
  updateThreshold: 10,
  heightScale: 6,
  noiseScale: 0.02,
  fogNear: 15,
  fogFar: 100,
  cameraHeight: 12,
  cameraDistance: 18,
  moveSpeed: new THREE.Vector3(0.005, 0, 0.003),
  initialChunks: 1,
  chunkGenerationBatchSize: 1,
  wireframe: true,
  wireframeOpacity: 0.4,
  antialias: false,
  pixelRatio: 1,
  terrainColor: '#ffffff',
};

const QUALITY_PRESETS = {
  ultra: {
    segments: 60,
    renderDistance: 4,
    antialias: true,
    pixelRatio: 2,
  },
  high: {
    segments: 45,
    renderDistance: 3,
    antialias: true,
    pixelRatio: 1,
  },
  medium: {
    segments: 30,
    renderDistance: 2,
    antialias: false,
    pixelRatio: 1,
  },
  low: {
    segments: 20,
    renderDistance: 2,
    antialias: false,
    pixelRatio: 0.75,
  },
} satisfies Record<string, QualityPreset>;

type QualityKey = keyof typeof QUALITY_PRESETS;
type CurrentQuality = 'custom' | QualityKey;

const DEFAULT_STAR_CONFIG = {
  chunkSize: 50,
  renderDistance: 2,
  starsPerChunk: 50,
  chunkGenerationBatchSize: 1,
  yRange: [5, 10] as [number, number],
  enabled: true,
  starSize: 0.3,
  starOpacity: 0.8,
};

type StarConfig = typeof DEFAULT_STAR_CONFIG;

const getRandomFloat = () => {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);

  return values[0] / 0x100000000;
};

const randomBetween = (min: number, max: number) => min + getRandomFloat() * (max - min);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === null || error === undefined) return 'Unknown error';

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};

class TerrainNoiseGenerator {
  private readonly gradientVectors: number[][];
  private readonly permutationTable: number[];
  public readonly noiseCache: Map<string, number>;

  constructor() {
    this.gradientVectors = [
      [1, 1, 0],
      [-1, 1, 0],
      [1, -1, 0],
      [-1, -1, 0],
      [1, 0, 1],
      [-1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1],
      [0, 1, 1],
      [0, -1, 1],
      [0, 1, -1],
      [0, -1, -1],
    ];

    const basePermutation = Array.from({ length: 256 }, () => Math.floor(getRandomFloat() * 256));
    this.permutationTable = [...basePermutation, ...basePermutation];
    this.noiseCache = new Map();
  }

  private calculateGradientDot(gradientIndex: number[], x: number, y: number): number {
    return gradientIndex[0] * x + gradientIndex[1] * y;
  }

  generateNoise(x: number, y: number): number {
    const cacheKey = `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
    const cachedNoise = this.noiseCache.get(cacheKey);
    if (cachedNoise !== undefined) return cachedNoise;

    const skewFactor = 0.5 * (Math.sqrt(3) - 1);
    const unskewFactor = (3 - Math.sqrt(3)) / 6;
    const skew = (x + y) * skewFactor;
    const [cellX, cellY] = [Math.floor(x + skew), Math.floor(y + skew)];
    const unskew = (cellX + cellY) * unskewFactor;
    const [originX, originY] = [cellX - unskew, cellY - unskew];
    const [relativeX, relativeY] = [x - originX, y - originY];
    const [offsetX, offsetY] = relativeX > relativeY ? [1, 0] : [0, 1];
    const x1 = relativeX - offsetX + unskewFactor;
    const y1 = relativeY - offsetY + unskewFactor;
    const x2 = relativeX - 1 + 2 * unskewFactor;
    const y2 = relativeY - 1 + 2 * unskewFactor;
    const [gridX, gridY] = [cellX & 255, cellY & 255];
    const gradientIndices = [
      this.permutationTable[(gridX + this.permutationTable[gridY]) & 255] % 12,
      this.permutationTable[(gridX + offsetX + this.permutationTable[gridY + offsetY]) & 255] % 12,
      this.permutationTable[(gridX + 1 + this.permutationTable[gridY + 1]) & 255] % 12,
    ];

    const calculateCornerContribution = (cornerX: number, cornerY: number, gradientIndex: number): number => {
      const t = 0.5 - cornerX * cornerX - cornerY * cornerY;
      return t < 0
        ? 0
        : Math.pow(t, 4) * this.calculateGradientDot(this.gradientVectors[gradientIndex], cornerX, cornerY);
    };

    const noise =
      70 *
      (calculateCornerContribution(relativeX, relativeY, gradientIndices[0]) +
        calculateCornerContribution(x1, y1, gradientIndices[1]) +
        calculateCornerContribution(x2, y2, gradientIndices[2]));

    this.noiseCache.set(cacheKey, noise);
    return noise;
  }

  generateTerrainNoise(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2): number {
    const cacheKey = `${Math.round(x * 1000)},${Math.round(y * 1000)}_${octaves}_${persistence}_${lacunarity}`;
    const cachedTerrain = this.noiseCache.get(cacheKey);
    if (cachedTerrain !== undefined) return cachedTerrain;

    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let index = 0; index < octaves; index += 1) {
      total += this.generateNoise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    const result = total / maxValue;
    this.noiseCache.set(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.noiseCache.clear();
  }
}

interface ToggleSettingProps {
  checked: boolean;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}

const ToggleSetting = ({ checked, disabled = false, id, label, onChange }: ToggleSettingProps) => (
  <label className={`flex items-center justify-between gap-4 py-2 ${disabled ? 'opacity-50' : ''}`} htmlFor={id}>
    <span>{label}</span>
    <input
      id={id}
      className="h-5 w-10 accent-white"
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
);

interface RangeSettingProps {
  disabled?: boolean;
  id: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}

const RangeSetting = ({ disabled = false, id, label, max, min, onChange, step, value }: RangeSettingProps) => (
  <div className={`mt-3 block ${disabled ? 'opacity-50' : ''}`}>
    <div className="mb-1 flex justify-between text-sm">
      <label htmlFor={id}>{label}</label>
      <span aria-hidden="true">{value}</span>
    </div>
    <input
      id={id}
      className="w-full accent-white"
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </div>
);

const TerrainBackground = ({
  onLoad,
  onSettingsOpenChange,
  onToast,
  settingsOpen = false,
  'aria-label': ariaLabel = 'Interactive 3D terrain background',
  'aria-hidden': ariaHidden = false,
}: TerrainBackgroundProps) => {
  const containerRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraTargetPosition = useRef(
    new THREE.Vector3(0, DEFAULT_TERRAIN_CONFIG.cameraHeight, DEFAULT_TERRAIN_CONFIG.cameraDistance)
  );
  const currentSpeed = useRef(new THREE.Vector3());
  const lastChunkUpdatePosition = useRef(new THREE.Vector3());
  const isInitializedRef = useRef(false);
  const chunkGenerationQueue = useRef<Array<[number, number]>>([]);
  const generatedChunks = useRef(0);
  const starChunkGenerationQueue = useRef<Array<[number, number]>>([]);
  const starChunksMap = useRef(new Map<string, THREE.Points>());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const terrainMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [localSettingsOpen, setLocalSettingsOpen] = useState(settingsOpen);
  const [terrainConfig, setTerrainConfig] = useState<TerrainConfig>({ ...DEFAULT_TERRAIN_CONFIG });
  const [starConfig, setStarConfig] = useState<StarConfig>({ ...DEFAULT_STAR_CONFIG });
  const [currentQuality, setCurrentQuality] = useState<CurrentQuality>('medium');
  const [needsRestart, setNeedsRestart] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);

  const notifyError = useCallback(
    (message: string, error: unknown) => {
      const errorMessage = getErrorMessage(error);
      onToast?.(`${message}: ${errorMessage}`, 'error');
    },
    [onToast]
  );

  const savePreferences = useCallback(
    (configToSave?: {
      terrainConfig?: TerrainConfig;
      starConfig?: StarConfig;
      currentQuality?: CurrentQuality;
    }) => {
      try {
        const sourceTerrainConfig = configToSave?.terrainConfig || terrainConfig;
        const terrainConfigWithoutCamera = {
          chunkSize: sourceTerrainConfig.chunkSize,
          segments: sourceTerrainConfig.segments,
          renderDistance: sourceTerrainConfig.renderDistance,
          overlap: sourceTerrainConfig.overlap,
          updateThreshold: sourceTerrainConfig.updateThreshold,
          heightScale: sourceTerrainConfig.heightScale,
          noiseScale: sourceTerrainConfig.noiseScale,
          fogNear: sourceTerrainConfig.fogNear,
          fogFar: sourceTerrainConfig.fogFar,
          moveSpeed: sourceTerrainConfig.moveSpeed,
          initialChunks: sourceTerrainConfig.initialChunks,
          chunkGenerationBatchSize: sourceTerrainConfig.chunkGenerationBatchSize,
          wireframe: sourceTerrainConfig.wireframe,
          wireframeOpacity: sourceTerrainConfig.wireframeOpacity,
          antialias: sourceTerrainConfig.antialias,
          pixelRatio: sourceTerrainConfig.pixelRatio,
          terrainColor: sourceTerrainConfig.terrainColor,
        };

        globalThis.localStorage.setItem(
          TERRAIN_PREFERENCES_KEY,
          JSON.stringify({
            terrainConfig: terrainConfigWithoutCamera,
            starConfig: configToSave?.starConfig || starConfig,
            currentQuality: configToSave?.currentQuality || currentQuality,
          })
        );
      } catch (error) {
        notifyError('Error saving terrain preferences', error);
      }
    },
    [currentQuality, notifyError, starConfig, terrainConfig]
  );

  useEffect(() => {
    setDevicePixelRatio(globalThis.devicePixelRatio || 1);
  }, []);

  useEffect(() => {
    try {
      const savedPrefs = globalThis.localStorage.getItem(TERRAIN_PREFERENCES_KEY);
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs) as {
          terrainConfig?: Partial<TerrainConfig> & { moveSpeed?: { x: number; y: number; z: number } };
          starConfig?: Partial<StarConfig>;
          currentQuality?: CurrentQuality;
        };

        if (parsedPrefs.terrainConfig) {
          const parsedTerrainConfig = { ...parsedPrefs.terrainConfig };
          const savedMoveSpeed = parsedTerrainConfig.moveSpeed;

          setTerrainConfig((previousConfig) => ({
            ...previousConfig,
            ...parsedTerrainConfig,
            moveSpeed: savedMoveSpeed
              ? new THREE.Vector3(savedMoveSpeed.x, savedMoveSpeed.y, savedMoveSpeed.z)
              : previousConfig.moveSpeed,
            cameraHeight: DEFAULT_TERRAIN_CONFIG.cameraHeight,
            cameraDistance: DEFAULT_TERRAIN_CONFIG.cameraDistance,
          }));
        }

        if (parsedPrefs.starConfig) {
          setStarConfig((previousConfig) => ({ ...previousConfig, ...parsedPrefs.starConfig }));
        }

        if (parsedPrefs.currentQuality) {
          setCurrentQuality(parsedPrefs.currentQuality);
        }
      }
    } catch (error) {
      notifyError('Error loading terrain preferences', error);
    } finally {
      setPreferencesLoaded(true);
    }
  }, [notifyError]);

  const handleTerrainConfigChange = useCallback(
    (property: keyof TerrainConfig, value: TerrainConfig[keyof TerrainConfig]) => {
      const requiresRestart = (
        [
          'antialias',
          'pixelRatio',
          'segments',
          'renderDistance',
          'chunkSize',
          'overlap',
          'heightScale',
          'noiseScale',
          'fogNear',
          'fogFar',
          'moveSpeed',
          'initialChunks',
          'chunkGenerationBatchSize',
        ] as Array<keyof TerrainConfig>
      ).includes(property);

      if (property === 'pixelRatio' && rendererRef.current) {
        rendererRef.current.setPixelRatio(value as number);
      }

      if (requiresRestart) {
        setCurrentQuality('custom');
        setNeedsRestart(true);
      }

      setTerrainConfig((previousConfig) => {
        const updatedConfig = { ...previousConfig, [property]: value } as TerrainConfig;
        savePreferences({ terrainConfig: updatedConfig, currentQuality: requiresRestart ? 'custom' : currentQuality });
        return updatedConfig;
      });
    },
    [currentQuality, savePreferences]
  );

  const handleStarConfigChange = useCallback(
    (property: keyof StarConfig, value: StarConfig[keyof StarConfig]) => {
      const requiresRestart = (
        ['chunkSize', 'renderDistance', 'starsPerChunk', 'chunkGenerationBatchSize', 'yRange'] as Array<keyof StarConfig>
      ).includes(property);

      if (requiresRestart) setNeedsRestart(true);

      setStarConfig((previousConfig) => {
        const updatedConfig = { ...previousConfig, [property]: value } as StarConfig;
        savePreferences({ starConfig: updatedConfig });
        return updatedConfig;
      });
    },
    [savePreferences]
  );

  const handleQualityPresetChange = useCallback(
    (preset: QualityKey) => {
      setCurrentQuality(preset);
      setNeedsRestart(true);
      setTerrainConfig((previousConfig) => {
        const updatedConfig = { ...previousConfig, ...QUALITY_PRESETS[preset] };
        savePreferences({ terrainConfig: updatedConfig, currentQuality: preset });
        return updatedConfig;
      });
    },
    [savePreferences]
  );

  const resetSettings = useCallback(() => {
    const defaultTerrainConfig = { ...DEFAULT_TERRAIN_CONFIG };
    const defaultStarConfig = { ...DEFAULT_STAR_CONFIG };
    setTerrainConfig(defaultTerrainConfig);
    setStarConfig(defaultStarConfig);
    setCurrentQuality('medium');
    setNeedsRestart(true);
    savePreferences({
      terrainConfig: defaultTerrainConfig,
      starConfig: defaultStarConfig,
      currentQuality: 'medium',
    });
  }, [savePreferences]);

  useEffect(() => {
    if (!containerRef.current || !preferencesLoaded) return undefined;

    isInitializedRef.current = false;
    generatedChunks.current = 0;
    setIsInitialized(false);

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const cameraFar = terrainConfig.fogFar * 2;
    const camera = new THREE.PerspectiveCamera(60, globalThis.innerWidth / globalThis.innerHeight, 0.1, cameraFar);
    const renderer = new THREE.WebGLRenderer({
      antialias: terrainConfig.antialias,
      alpha: true,
      powerPreference: 'low-power',
    });
    rendererRef.current = renderer;

    const terrainMaterial = new THREE.MeshBasicMaterial({
      wireframe: terrainConfig.wireframe,
      color: new THREE.Color(terrainConfig.terrainColor),
      transparent: true,
      opacity: terrainConfig.wireframeOpacity,
      depthWrite: false,
    });
    terrainMaterialRef.current = terrainMaterial;
    const sharedGeometryCache = new Map<string, THREE.PlaneGeometry>();

    const disposeStarMaterial = (material: THREE.Material | THREE.Material[]) => {
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material.dispose();
      }
    };

    const getSharedGeometry = (chunkSize: number, overlap: number, segments: number): THREE.PlaneGeometry => {
      const cacheKey = `${chunkSize}_${overlap}_${segments}`;
      const cachedGeometry = sharedGeometryCache.get(cacheKey);
      if (cachedGeometry) return cachedGeometry;

      const geometry = new THREE.PlaneGeometry(
        chunkSize + overlap * 2,
        chunkSize + overlap * 2,
        segments + 2 * overlap,
        segments + 2 * overlap
      );
      sharedGeometryCache.set(cacheKey, geometry);
      return geometry;
    };

    renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
    renderer.setPixelRatio(terrainConfig.pixelRatio);
    container.appendChild(renderer.domElement);
    scene.fog = new THREE.Fog(0x000000, terrainConfig.fogNear, terrainConfig.fogFar);

    camera.position.set(0, terrainConfig.cameraHeight, terrainConfig.cameraDistance);
    camera.lookAt(camera.position.x, terrainConfig.cameraHeight * 0.4, camera.position.z - terrainConfig.cameraDistance);
    cameraTargetPosition.current = new THREE.Vector3(0, terrainConfig.cameraHeight, terrainConfig.cameraDistance);

    const noiseGenerator = new TerrainNoiseGenerator();
    const terrainChunks = new Map<string, THREE.Mesh>();
    const pendingChunks = new Set<string>();
    const textureCache = new Map<string, THREE.Texture>();
    const loader = new THREE.TextureLoader();
    const getChunkKey = (x: number, z: number): string => `${x},${z}`;

    const initializeChunkQueue = () => {
      const cameraChunkX = Math.floor(camera.position.x / terrainConfig.chunkSize);
      const cameraChunkZ = Math.floor(camera.position.z / terrainConfig.chunkSize);
      chunkGenerationQueue.current = [];
      pendingChunks.clear();

      for (let x = cameraChunkX - terrainConfig.renderDistance; x <= cameraChunkX + terrainConfig.renderDistance; x += 1) {
        for (let z = cameraChunkZ - terrainConfig.renderDistance; z <= cameraChunkZ + terrainConfig.renderDistance; z += 1) {
          const chunkKey = getChunkKey(x, z);
          if (!terrainChunks.has(chunkKey)) {
            chunkGenerationQueue.current.push([x, z]);
            pendingChunks.add(chunkKey);
          }
        }
      }
    };

    const getTerrainChunk = (chunkX: number, chunkZ: number) => {
      const chunkKey = getChunkKey(chunkX, chunkZ);
      if (terrainChunks.has(chunkKey)) return terrainChunks.get(chunkKey);

      pendingChunks.delete(chunkKey);
      const sharedGeometry = getSharedGeometry(terrainConfig.chunkSize, terrainConfig.overlap, terrainConfig.segments);
      const geometry = sharedGeometry.clone();
      const positionsArray = geometry.attributes.position.array as Float32Array;
      const segmentsWithOverlap = terrainConfig.segments + 2 * terrainConfig.overlap + 1;
      const xFactor = terrainConfig.chunkSize / terrainConfig.segments;
      const zFactor = terrainConfig.chunkSize / terrainConfig.segments;

      for (let index = 0; index < positionsArray.length; index += 3) {
        const vertexIndex = index / 3;
        const x = vertexIndex % segmentsWithOverlap;
        const z = Math.floor(vertexIndex / segmentsWithOverlap);
        const worldX = (x - terrainConfig.overlap) * xFactor + chunkX * terrainConfig.chunkSize;
        const worldZ = (z - terrainConfig.overlap) * zFactor + chunkZ * terrainConfig.chunkSize;
        positionsArray[index + 2] =
          noiseGenerator.generateTerrainNoise(worldX * terrainConfig.noiseScale, worldZ * terrainConfig.noiseScale) *
          terrainConfig.heightScale;
      }

      geometry.attributes.position.needsUpdate = true;
      const chunk = new THREE.Mesh(geometry, terrainMaterial);
      chunk.rotation.x = -Math.PI / 2;
      chunk.position.set(chunkX * terrainConfig.chunkSize, 0, chunkZ * terrainConfig.chunkSize);
      scene.add(chunk);
      terrainChunks.set(chunkKey, chunk);
      generatedChunks.current += 1;
      return chunk;
    };

    const generateChunkBatch = () => {
      const batchSize = Math.min(terrainConfig.chunkGenerationBatchSize, chunkGenerationQueue.current.length);
      if (batchSize === 0) return;

      for (let index = 0; index < batchSize; index += 1) {
        const nextChunk = chunkGenerationQueue.current.shift();
        if (nextChunk) getTerrainChunk(nextChunk[0], nextChunk[1]);
      }

      if (!isInitializedRef.current && generatedChunks.current >= terrainConfig.initialChunks) {
        isInitializedRef.current = true;
        setIsInitialized(true);
        onLoad?.();
      }
    };

    const updateVisibleChunks = () => {
      const cameraChunkX = Math.floor(cameraTargetPosition.current.x / terrainConfig.chunkSize);
      const cameraChunkZ = Math.floor(cameraTargetPosition.current.z / terrainConfig.chunkSize);

      for (let x = cameraChunkX - terrainConfig.renderDistance; x <= cameraChunkX + terrainConfig.renderDistance; x += 1) {
        for (let z = cameraChunkZ - terrainConfig.renderDistance; z <= cameraChunkZ + terrainConfig.renderDistance; z += 1) {
          const chunkKey = getChunkKey(x, z);
          const isQueued = chunkGenerationQueue.current.some(([cx, cz]) => cx === x && cz === z);
          if (!terrainChunks.has(chunkKey) && !isQueued && !pendingChunks.has(chunkKey)) {
            chunkGenerationQueue.current.push([x, z]);
            pendingChunks.add(chunkKey);
          }
        }
      }

      terrainChunks.forEach((chunk, key) => {
        const [chunkX, chunkZ] = key.split(',').map(Number);
        if (
          Math.abs(chunkX - cameraChunkX) > terrainConfig.renderDistance ||
          Math.abs(chunkZ - cameraChunkZ) > terrainConfig.renderDistance
        ) {
          scene.remove(chunk);
          terrainChunks.delete(key);
          chunk.geometry.dispose();
        }
      });

      if (generatedChunks.current % 10 === 0 && noiseGenerator.noiseCache.size > 5000) {
        noiseGenerator.clearCache();
      }
    };

    const createStarMaterial = (texturePath: string): THREE.PointsMaterial => {
      const cachedTexture = textureCache.get(texturePath);
      const texture = cachedTexture || loader.load(texturePath);
      if (!cachedTexture) textureCache.set(texturePath, texture);

      return new THREE.PointsMaterial({
        size: starConfig.starSize,
        map: texture,
        transparent: true,
        opacity: starConfig.starOpacity,
        fog: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    };

    const getStarChunk = (chunkX: number, chunkZ: number) => {
      const chunkKey = getChunkKey(chunkX, chunkZ);
      if (starChunksMap.current.has(chunkKey)) return starChunksMap.current.get(chunkKey);

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(starConfig.starsPerChunk * 3);

      for (let index = 0; index < starConfig.starsPerChunk; index += 1) {
        const offsetX = randomBetween(0, starConfig.chunkSize);
        const offsetZ = randomBetween(0, starConfig.chunkSize);
        const worldX = chunkX * starConfig.chunkSize + offsetX;
        const worldZ = chunkZ * starConfig.chunkSize + offsetZ;
        const worldY = randomBetween(starConfig.yRange[0], starConfig.yRange[1]);
        const positionIndex = index * 3;
        positions[positionIndex] = worldX;
        positions[positionIndex + 1] = worldY;
        positions[positionIndex + 2] = worldZ;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const texturePath = getRandomFloat() > 0.5 ? '/images/sp1.png' : '/images/sp2.png';
      const starChunk = new THREE.Points(geometry, createStarMaterial(texturePath));
      starChunk.visible = starConfig.enabled;
      scene.add(starChunk);
      starChunksMap.current.set(chunkKey, starChunk);
      return starChunk;
    };

    const initializeStarChunkQueue = () => {
      const cameraStarChunkX = Math.floor(camera.position.x / starConfig.chunkSize);
      const cameraStarChunkZ = Math.floor(camera.position.z / starConfig.chunkSize);
      starChunkGenerationQueue.current = [];

      for (let x = cameraStarChunkX - starConfig.renderDistance; x <= cameraStarChunkX + starConfig.renderDistance; x += 1) {
        for (let z = cameraStarChunkZ - starConfig.renderDistance; z <= cameraStarChunkZ + starConfig.renderDistance; z += 1) {
          const chunkKey = getChunkKey(x, z);
          if (!starChunksMap.current.has(chunkKey)) starChunkGenerationQueue.current.push([x, z]);
        }
      }
    };

    const generateStarChunkBatch = () => {
      const batchSize = Math.min(starConfig.chunkGenerationBatchSize, starChunkGenerationQueue.current.length);
      if (batchSize === 0) return;

      for (let index = 0; index < batchSize; index += 1) {
        const nextChunk = starChunkGenerationQueue.current.shift();
        if (nextChunk) getStarChunk(nextChunk[0], nextChunk[1]);
      }
    };

    const updateVisibleStarChunks = () => {
      const cameraChunkX = Math.floor(cameraTargetPosition.current.x / starConfig.chunkSize);
      const cameraChunkZ = Math.floor(cameraTargetPosition.current.z / starConfig.chunkSize);

      for (let x = cameraChunkX - starConfig.renderDistance; x <= cameraChunkX + starConfig.renderDistance; x += 1) {
        for (let z = cameraChunkZ - starConfig.renderDistance; z <= cameraChunkZ + starConfig.renderDistance; z += 1) {
          const chunkKey = getChunkKey(x, z);
          const isQueued = starChunkGenerationQueue.current.some(([cx, cz]) => cx === x && cz === z);
          if (!starChunksMap.current.has(chunkKey) && !isQueued) starChunkGenerationQueue.current.push([x, z]);
        }
      }

      starChunksMap.current.forEach((starChunk, key) => {
        const [chunkX, chunkZ] = key.split(',').map(Number);
        if (
          Math.abs(chunkX - cameraChunkX) > starConfig.renderDistance ||
          Math.abs(chunkZ - cameraChunkZ) > starConfig.renderDistance
        ) {
          scene.remove(starChunk);
          starChunk.geometry.dispose();
          disposeStarMaterial(starChunk.material);
          starChunksMap.current.delete(key);
        }
      });
    };

    const handleResize = () => {
      camera.aspect = globalThis.innerWidth / globalThis.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
    };

    globalThis.addEventListener('resize', handleResize);
    initializeChunkQueue();
    initializeStarChunkQueue();

    const animate = () => {
      if (chunkGenerationQueue.current.length > 0) {
        generateChunkBatch();
      } else if (starChunkGenerationQueue.current.length > 0) {
        generateStarChunkBatch();
      }

      currentSpeed.current.lerp(terrainConfig.moveSpeed, 0.02);
      cameraTargetPosition.current.add(currentSpeed.current);
      camera.position.lerp(cameraTargetPosition.current, 0.05);
      camera.lookAt(camera.position.x, 0, camera.position.z - terrainConfig.cameraDistance);

      const dx = Math.abs(cameraTargetPosition.current.x - lastChunkUpdatePosition.current.x);
      const dz = Math.abs(cameraTargetPosition.current.z - lastChunkUpdatePosition.current.z);

      if (dx > terrainConfig.updateThreshold || dz > terrainConfig.updateThreshold) {
        updateVisibleChunks();
        updateVisibleStarChunks();
        lastChunkUpdatePosition.current.copy(cameraTargetPosition.current);
      }

      renderer.render(scene, camera);
      animationFrameRef.current = globalThis.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      globalThis.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) globalThis.cancelAnimationFrame(animationFrameRef.current);
      renderer.domElement.remove();

      terrainChunks.forEach((chunk) => {
        chunk.geometry.dispose();
        scene.remove(chunk);
      });
      terrainChunks.clear();
      terrainMaterial.dispose();
      terrainMaterialRef.current = null;

      starChunksMap.current.forEach((starChunk) => {
        starChunk.geometry.dispose();
        disposeStarMaterial(starChunk.material);
        scene.remove(starChunk);
      });
      starChunksMap.current.clear();
      starChunkGenerationQueue.current = [];

      sharedGeometryCache.forEach((geometry) => geometry.dispose());
      sharedGeometryCache.clear();
      textureCache.forEach((texture) => texture.dispose());
      textureCache.clear();
      noiseGenerator.clearCache();
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
    };
    // Restart-only scene creation keeps expensive renderer work under explicit user control.
  }, [restartKey, preferencesLoaded]);

  useEffect(() => {
    if (!sceneRef.current || !terrainMaterialRef.current) return;

    terrainMaterialRef.current.wireframe = terrainConfig.wireframe;
    terrainMaterialRef.current.opacity = terrainConfig.wireframeOpacity;
    terrainMaterialRef.current.color = new THREE.Color(terrainConfig.terrainColor);

    starChunksMap.current.forEach((chunk) => {
      chunk.visible = starConfig.enabled;
      if (!Array.isArray(chunk.material)) {
        const material = chunk.material as THREE.PointsMaterial;
        material.size = starConfig.starSize;
        material.opacity = starConfig.starOpacity;
      }
    });

    cameraTargetPosition.current.y = terrainConfig.cameraHeight;
    cameraTargetPosition.current.z = terrainConfig.cameraDistance;
  }, [
    starConfig.enabled,
    starConfig.starOpacity,
    starConfig.starSize,
    terrainConfig.cameraDistance,
    terrainConfig.cameraHeight,
    terrainConfig.terrainColor,
    terrainConfig.wireframe,
    terrainConfig.wireframeOpacity,
  ]);

  useEffect(() => {
    setLocalSettingsOpen(settingsOpen);
  }, [settingsOpen]);

  const handleSettingsOpenChange = useCallback(
    (open: boolean) => {
      setLocalSettingsOpen(open);
      onSettingsOpenChange?.(open);
    },
    [onSettingsOpenChange]
  );

  const handleSettingsKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') handleSettingsOpenChange(false);
    },
    [handleSettingsOpenChange]
  );

  return (
    <>
      <section
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
      >
        {isInitialized ? null : <div className="absolute inset-0 z-[1] bg-black" aria-label="Loading terrain background" />}
        <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden="true" />
      </section>

      {localSettingsOpen ? (
      <dialog
        id="terrain-settings-panel"
        open
        className="fixed inset-0 z-40 m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 text-white"
        aria-labelledby="terrain-settings-title"
        onKeyDown={handleSettingsKeyDown}
      >
        <button
          className="absolute inset-0 bg-black/40"
          type="button"
          aria-label="Close terrain settings backdrop"
          onClick={() => handleSettingsOpenChange(false)}
        />
        <section
          className="absolute top-0 left-0 h-full w-4/5 max-w-[350px] overflow-y-auto bg-black/95 p-6 text-white shadow-2xl transition-transform duration-300 sm:w-[350px]"
          aria-labelledby="terrain-settings-title"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 id="terrain-settings-title" className="m-0 text-2xl font-medium">
              Terrain Settings
            </h2>
            <button
              className="rounded border border-red-300/70 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/20"
              type="button"
              aria-label="Reset to default settings"
              onClick={resetSettings}
            >
              Reset
            </button>
          </div>

          <section className="mb-6" aria-labelledby="quality-preset-label">
            <h3 id="quality-preset-label" className="mb-2 text-base font-medium">
              Quality Preset
            </h3>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="quality-preset-label">
              {(Object.keys(QUALITY_PRESETS) as QualityKey[]).map((preset) => (
                <button
                  key={preset}
                  className={`min-w-0 flex-1 rounded border border-white/30 px-3 py-2 text-sm capitalize transition ${
                    currentQuality === preset ? 'bg-[#304FFE] text-white' : 'bg-transparent text-white hover:bg-white/10'
                  }`}
                  type="button"
                  role="radio"
                  aria-checked={currentQuality === preset}
                  aria-label={`${preset} quality`}
                  onClick={() => handleQualityPresetChange(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>

            {needsRestart ? (
              <div className="mt-3 rounded bg-yellow-300/20 p-3" role="alert">
                <p className="mt-0 mb-2 text-xs text-yellow-200">Some changes require restarting the terrain renderer.</p>
                <button
                  className="w-full rounded bg-yellow-300/60 px-3 py-2 text-sm font-medium text-black transition hover:bg-yellow-300/80"
                  type="button"
                  aria-label="Apply changes and restart renderer"
                  onClick={() => {
                    setRestartKey((key) => key + 1);
                    setNeedsRestart(false);
                  }}
                >
                  Apply & Restart Renderer
                </button>
              </div>
            ) : null}
          </section>

          <section className="mb-6" aria-labelledby="rendering-settings-label">
            <h3 id="rendering-settings-label" className="mb-2 text-base font-medium">
              Rendering
            </h3>
            <ToggleSetting
              id="terrain-antialias"
              label="Anti-aliasing"
              checked={terrainConfig.antialias}
              onChange={(checked) => handleTerrainConfigChange('antialias', checked)}
            />
            <RangeSetting
              id="terrain-detail"
              label="Terrain Detail"
              value={terrainConfig.segments}
              min={10}
              max={60}
              step={5}
              onChange={(value) => handleTerrainConfigChange('segments', value)}
            />
            <RangeSetting
              id="terrain-render-distance"
              label="Render Distance"
              value={terrainConfig.renderDistance}
              min={2}
              max={5}
              step={1}
              onChange={(value) => handleTerrainConfigChange('renderDistance', value)}
            />
            <RangeSetting
              id="terrain-pixel-ratio"
              label="Pixel Ratio"
              value={terrainConfig.pixelRatio}
              min={0.5}
              max={Math.min(2, devicePixelRatio)}
              step={0.25}
              onChange={(value) => handleTerrainConfigChange('pixelRatio', value)}
            />
            <div className="mt-1 flex justify-between text-xs text-white/60">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
            </div>
          </section>

          <section className="mb-6" aria-labelledby="wireframe-settings-label">
            <h3 id="wireframe-settings-label" className="mb-2 text-base font-medium">
              Wireframe
            </h3>
            <ToggleSetting
              id="terrain-wireframe"
              label="Enable Wireframe"
              checked={terrainConfig.wireframe}
              onChange={(checked) => handleTerrainConfigChange('wireframe', checked)}
            />
            <RangeSetting
              id="terrain-wireframe-opacity"
              label="Wireframe Opacity"
              value={terrainConfig.wireframeOpacity}
              min={0.1}
              max={1}
              step={0.1}
              disabled={!terrainConfig.wireframe}
              onChange={(value) => handleTerrainConfigChange('wireframeOpacity', value)}
            />
          </section>

          <section className="mb-6" aria-labelledby="terrain-shape-label">
            <h3 id="terrain-shape-label" className="mb-2 text-base font-medium">
              Terrain Shape
            </h3>
            <RangeSetting
              id="terrain-height-scale"
              label="Height Scale"
              value={terrainConfig.heightScale}
              min={1}
              max={20}
              step={1}
              onChange={(value) => handleTerrainConfigChange('heightScale', value)}
            />
            <RangeSetting
              id="terrain-noise-scale"
              label="Noise Scale"
              value={terrainConfig.noiseScale}
              min={0.005}
              max={0.05}
              step={0.005}
              onChange={(value) => handleTerrainConfigChange('noiseScale', value)}
            />
          </section>

          <section className="mb-6" aria-labelledby="star-settings-label">
            <h3 id="star-settings-label" className="mb-2 text-base font-medium">
              Stars
            </h3>
            <ToggleSetting
              id="terrain-stars"
              label="Show Stars"
              checked={starConfig.enabled}
              onChange={(checked) => handleStarConfigChange('enabled', checked)}
            />
            <RangeSetting
              id="terrain-star-size"
              label="Star Size"
              value={starConfig.starSize}
              min={0.1}
              max={1}
              step={0.1}
              disabled={!starConfig.enabled}
              onChange={(value) => handleStarConfigChange('starSize', value)}
            />
            <RangeSetting
              id="terrain-star-opacity"
              label="Star Opacity"
              value={starConfig.starOpacity}
              min={0.1}
              max={1}
              step={0.1}
              disabled={!starConfig.enabled}
              onChange={(value) => handleStarConfigChange('starOpacity', value)}
            />
            <RangeSetting
              id="terrain-stars-per-chunk"
              label="Stars Per Chunk"
              value={starConfig.starsPerChunk}
              min={10}
              max={200}
              step={10}
              disabled={!starConfig.enabled}
              onChange={(value) => handleStarConfigChange('starsPerChunk', value)}
            />
          </section>

          <section className="mb-6" aria-labelledby="appearance-settings-label">
            <h3 id="appearance-settings-label" className="mb-2 text-base font-medium">
              Appearance
            </h3>
            <label className="flex items-center gap-4" htmlFor="terrain-color">
              <span className="text-sm">Terrain Color</span>
              <input
                id="terrain-color"
                className="h-10 w-10 cursor-pointer rounded-full border-0 bg-transparent"
                type="color"
                value={terrainConfig.terrainColor}
                onChange={(event) => handleTerrainConfigChange('terrainColor', event.target.value)}
              />
            </label>
          </section>

          <section className="mb-6" aria-labelledby="camera-settings-label">
            <h3 id="camera-settings-label" className="mb-2 text-base font-medium">
              Camera
            </h3>
            <p className="rounded bg-white/10 p-2 text-center text-xs text-white/70" role="note" aria-live="polite">
              Camera settings will not be saved between sessions
            </p>
            <RangeSetting
              id="terrain-camera-height"
              label="Camera Height"
              value={terrainConfig.cameraHeight}
              min={5}
              max={25}
              step={1}
              onChange={(value) => handleTerrainConfigChange('cameraHeight', value)}
            />
            <RangeSetting
              id="terrain-camera-distance"
              label="Camera Distance"
              value={terrainConfig.cameraDistance}
              min={10}
              max={30}
              step={1}
              onChange={(value) => handleTerrainConfigChange('cameraDistance', value)}
            />
          </section>
        </section>
      </dialog>
      ) : null}
    </>
  );
};

export default TerrainBackground;
