/**
 * Generate adjacent dong mappings from GeoJSON boundary data
 *
 * Uses centroid-based distance calculation to determine adjacent dongs.
 * Hybrid approach: up to K nearest neighbors within max distance threshold.
 *
 * Data sources:
 * - Seoul: 법정동 GeoJSON from southkorea/seoul-maps (exact match to DONG_CODES)
 * - Nationwide: 행정동 GeoJSON from southkorea/southkorea-maps (mapped to 법정동 by name)
 *
 * Output: Replaces ADJACENT_DONGS in lib/data/adjacent-dongs.ts
 *
 * Usage: npx tsx scripts/generate-adjacent-dongs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { DONG_CODES, DISTRICT_CODES } from '../lib/data/nationwide-codes';

// === CONFIGURATION ===
const MAX_NEIGHBORS = 6;       // Maximum adjacent dongs per dong
const MAX_DISTANCE_KM = 2.0;   // Maximum centroid distance in km
const MIN_NEIGHBORS = 1;       // Minimum neighbors (relax distance if needed)
const RELAXED_DISTANCE_KM = 5.0; // Relaxed distance for MIN_NEIGHBORS guarantee

// === TYPES ===
interface GeoJSONFeature {
  type: string;
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
}

interface DongCentroid {
  districtName: string;
  sigunguCd: string;
  dongName: string;
  lat: number;
  lng: number;
}

// === HAVERSINE DISTANCE ===
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// === COMPUTE CENTROID FROM POLYGON COORDINATES ===
function computeCentroid(geometry: GeoJSONFeature['geometry']): { lat: number; lng: number } {
  const points: [number, number][] = [];

  if (geometry.type === 'Polygon') {
    // coordinates: number[][][] — [ring][point][lng, lat]
    for (const ring of geometry.coordinates as number[][][]) {
      for (const point of ring) {
        points.push([point[0], point[1]]); // [lng, lat]
      }
    }
  } else if (geometry.type === 'MultiPolygon') {
    // coordinates: number[][][][] — [polygon][ring][point][lng, lat]
    for (const polygon of geometry.coordinates as number[][][][]) {
      for (const ring of polygon) {
        for (const point of ring) {
          points.push([point[0], point[1]]);
        }
      }
    }
  }

  if (points.length === 0) {
    throw new Error('No coordinates found in geometry');
  }

  const sumLng = points.reduce((acc, p) => acc + p[0], 0);
  const sumLat = points.reduce((acc, p) => acc + p[1], 0);

  return {
    lng: sumLng / points.length,
    lat: sumLat / points.length,
  };
}

// === BUILD REVERSE LOOKUP: sigunguCd → districtName ===
function buildDistrictLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [key, sigunguCd] of Object.entries(DISTRICT_CODES)) {
    const districtName = key.split('|')[1];
    lookup.set(sigunguCd, districtName);
  }
  return lookup;
}

// === PROCESS SEOUL 법정동 GeoJSON ===
function processSeoulBeopjeongdong(filePath: string, districtLookup: Map<string, string>): DongCentroid[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const geojson = JSON.parse(raw);
  const centroids: DongCentroid[] = [];
  let matched = 0;
  let unmatched = 0;

  for (const feature of geojson.features as GeoJSONFeature[]) {
    const emdCd = feature.properties.EMD_CD as string; // 8 digits
    const dongName = feature.properties.EMD_KOR_NM as string;
    const sigunguCd = emdCd.slice(0, 5);
    const districtName = districtLookup.get(sigunguCd);

    if (!districtName) {
      unmatched++;
      continue;
    }

    // Verify this dong exists in our DONG_CODES
    const dongCodes = DONG_CODES[sigunguCd];
    if (!dongCodes || !dongCodes[dongName]) {
      // Try without trailing suffixes (e.g., "1가", "2가")
      // Some 법정동 have 가 suffixes that might be listed differently
      unmatched++;
      continue;
    }

    const centroid = computeCentroid(feature.geometry);
    centroids.push({
      districtName,
      sigunguCd,
      dongName,
      lat: centroid.lat,
      lng: centroid.lng,
    });
    matched++;
  }

  console.log(`Seoul 법정동: ${matched} matched, ${unmatched} unmatched`);
  return centroids;
}

// === PROCESS NATIONWIDE 행정동 GeoJSON ===
function processNationwideHaengjeongdong(filePath: string, districtLookup: Map<string, string>, seoulCentroids: DongCentroid[]): DongCentroid[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const geojson = JSON.parse(raw);
  const centroids: DongCentroid[] = [];

  console.log(`\nProcessing nationwide 행정동 → 법정동 mapping...`);

  // Step 1: Group 행정동 features by their 4-digit code prefix (=sigungu-level group)
  // The 7-digit 행정동 code: first 4 digits identify the sigungu, last 3 identify the dong
  const featuresByCodePrefix: Map<string, GeoJSONFeature[]> = new Map();
  for (const feature of geojson.features as GeoJSONFeature[]) {
    const code = feature.properties.code as string;
    const prefix = code.slice(0, 4);
    if (!featuresByCodePrefix.has(prefix)) {
      featuresByCodePrefix.set(prefix, []);
    }
    featuresByCodePrefix.get(prefix)!.push(feature);
  }

  // Step 2: For each 행정동 group (4-digit prefix), find the best matching sigunguCd
  // by counting dong name overlaps between the group's 행정동 names and our DONG_CODES
  // This correctly identifies which city a group belongs to
  const prefixToSigungu: Map<string, string> = new Map();

  // Skip Seoul — already covered by 법정동 data
  const seoulSigunguCds = new Set<string>();
  for (const [sigunguCd] of Object.entries(DONG_CODES)) {
    if (sigunguCd.startsWith('11') && parseInt(sigunguCd) >= 11010 && parseInt(sigunguCd) <= 11740) {
      seoulSigunguCds.add(sigunguCd);
    }
  }

  for (const [prefix, features] of featuresByCodePrefix) {
    // Extract base dong names from this group
    const groupBaseNames = new Set<string>();
    for (const f of features) {
      const name = f.properties.name as string;
      // Strip trailing number+동/가 patterns: 역삼1동 → 역삼동, 삼성2동 → 삼성동
      const baseName = name.replace(/\d+동$/, '동').replace(/\d+가$/, '가');
      groupBaseNames.add(baseName);
    }

    // Find the sigunguCd with most dong name overlaps
    let bestSigungu: string | null = null;
    let bestOverlap = 0;

    for (const [sigunguCd, dongs] of Object.entries(DONG_CODES)) {
      if (seoulSigunguCds.has(sigunguCd)) continue;
      const dongNames = new Set(Object.keys(dongs));
      let overlap = 0;
      for (const name of groupBaseNames) {
        if (dongNames.has(name)) overlap++;
      }
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestSigungu = sigunguCd;
      }
    }

    if (bestSigungu && bestOverlap >= 1) {
      prefixToSigungu.set(prefix, bestSigungu);
    }
  }

  console.log(`  Mapped ${prefixToSigungu.size}/${featuresByCodePrefix.size} 행정동 groups to sigunguCd`);

  // Step 3: Build index of features by (sigunguCd, baseDongName)
  // Each feature is assigned to a sigunguCd via its code prefix mapping
  const featuresBySigunguAndName: Map<string, GeoJSONFeature[]> = new Map();
  for (const [prefix, features] of featuresByCodePrefix) {
    const sigunguCd = prefixToSigungu.get(prefix);
    if (!sigunguCd) continue;

    for (const f of features) {
      const name = f.properties.name as string;
      const baseName = name.replace(/\d+동$/, '동').replace(/\d+가$/, '가');
      const key = `${sigunguCd}|${baseName}`;
      if (!featuresBySigunguAndName.has(key)) {
        featuresBySigunguAndName.set(key, []);
      }
      featuresBySigunguAndName.get(key)!.push(f);
    }
  }

  // Track which sigunguCd+dongName combos Seoul already covers
  const seoulCovered = new Set(seoulCentroids.map(c => `${c.sigunguCd}|${c.dongName}`));

  let matchedNonSeoul = 0;
  let unmatchedNonSeoul = 0;

  // Step 4: For each DONG_CODES entry, look up the correctly-identified feature
  for (const [sigunguCd, dongs] of Object.entries(DONG_CODES)) {
    const districtName = districtLookup.get(sigunguCd);
    if (!districtName) continue;
    if (seoulSigunguCds.has(sigunguCd)) continue;

    for (const [dongName] of Object.entries(dongs)) {
      const key = `${sigunguCd}|${dongName}`;
      if (seoulCovered.has(key)) continue;

      // Find matching 행정동 features for THIS specific sigunguCd
      const matchingFeatures = featuresBySigunguAndName.get(key);
      if (!matchingFeatures || matchingFeatures.length === 0) {
        unmatchedNonSeoul++;
        continue;
      }

      // If multiple features match (e.g., 역삼1동 + 역삼2동 both map to 역삼동),
      // average their centroids for a representative position
      if (matchingFeatures.length === 1) {
        const centroid = computeCentroid(matchingFeatures[0].geometry);
        centroids.push({ districtName, sigunguCd, dongName, lat: centroid.lat, lng: centroid.lng });
      } else {
        const allCentroids = matchingFeatures.map(f => computeCentroid(f.geometry));
        const avgLat = allCentroids.reduce((a, c) => a + c.lat, 0) / allCentroids.length;
        const avgLng = allCentroids.reduce((a, c) => a + c.lng, 0) / allCentroids.length;
        centroids.push({ districtName, sigunguCd, dongName, lat: avgLat, lng: avgLng });
      }
      matchedNonSeoul++;
    }
  }

  console.log(`  Non-Seoul: ${matchedNonSeoul} matched, ${unmatchedNonSeoul} unmatched`);
  return centroids;
}

// === COMPUTE ADJACENCY FROM CENTROIDS ===
function computeAdjacency(allCentroids: DongCentroid[]): Map<string, Map<string, string[]>> {
  // Group by sigunguCd (NOT districtName) to avoid merging same-named districts
  // e.g., 서울 강서구 (11500) and 부산 강서구 (26440) must be computed separately
  const bySigungu = new Map<string, DongCentroid[]>();
  for (const c of allCentroids) {
    if (!bySigungu.has(c.sigunguCd)) {
      bySigungu.set(c.sigunguCd, []);
    }
    bySigungu.get(c.sigunguCd)!.push(c);
  }

  // Result keyed by districtName (merging same-named districts is safe since
  // dong names are unique within each sigunguCd and different cities have different dong names)
  const result = new Map<string, Map<string, string[]>>();
  let totalDongs = 0;
  let totalWithNeighbors = 0;
  let totalNeighborPairs = 0;

  for (const [sigunguCd, dongs] of bySigungu) {
    if (dongs.length <= 1) continue; // Need at least 2 dongs

    const districtName = dongs[0].districtName;

    // Get or create dong map for this district name
    if (!result.has(districtName)) {
      result.set(districtName, new Map<string, string[]>());
    }
    const dongMap = result.get(districtName)!;

    for (const dong of dongs) {
      // Compute distance to all other dongs in same sigungu
      const distances: { name: string; dist: number }[] = [];
      for (const other of dongs) {
        if (other.dongName === dong.dongName) continue;
        const dist = haversineKm(dong.lat, dong.lng, other.lat, other.lng);
        distances.push({ name: other.dongName, dist });
      }

      // Sort by distance
      distances.sort((a, b) => a.dist - b.dist);

      // Hybrid selection: up to MAX_NEIGHBORS within MAX_DISTANCE_KM
      let neighbors = distances
        .filter(d => d.dist <= MAX_DISTANCE_KM)
        .slice(0, MAX_NEIGHBORS)
        .map(d => d.name);

      // Guarantee MIN_NEIGHBORS with relaxed distance
      if (neighbors.length < MIN_NEIGHBORS && distances.length > 0) {
        neighbors = distances
          .filter(d => d.dist <= RELAXED_DISTANCE_KM)
          .slice(0, MIN_NEIGHBORS)
          .map(d => d.name);
      }

      // Last resort: at least 1 nearest neighbor regardless of distance
      if (neighbors.length === 0 && distances.length > 0) {
        neighbors = [distances[0].name];
      }

      if (neighbors.length > 0) {
        // If same dong name already exists (from another sigunguCd with same districtName),
        // merge neighbors. This happens for dongs like 도원동 in both 대구 중구 and 인천 중구.
        // The extra neighbors are harmless — they just won't match any transactions in the
        // actual MOLIT API call (which uses the correct lawdCd/sigunguCd).
        const existing = dongMap.get(dong.dongName);
        if (existing) {
          const merged = [...new Set([...existing, ...neighbors])];
          dongMap.set(dong.dongName, merged);
        } else {
          dongMap.set(dong.dongName, neighbors);
        }
        totalWithNeighbors++;
      }
      totalDongs++;
    }
  }

  totalNeighborPairs = [...result.values()].reduce((acc, m) => {
    return acc + [...m.values()].reduce((a, v) => a + v.length, 0);
  }, 0);

  console.log(`\nAdjacency stats:`);
  console.log(`  Districts with mappings: ${result.size}`);
  console.log(`  Total dongs: ${totalDongs}`);
  console.log(`  Dongs with neighbors: ${totalWithNeighbors} (${((totalWithNeighbors / totalDongs) * 100).toFixed(1)}%)`);
  console.log(`  Total neighbor pairs: ${totalNeighborPairs}`);
  console.log(`  Avg neighbors per dong: ${(totalNeighborPairs / totalWithNeighbors).toFixed(1)}`);

  return result;
}

// === GENERATE OUTPUT ===
function generateOutput(adjacency: Map<string, Map<string, string[]>>): string {
  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * Auto-generated adjacent dong mappings (centroid-based)`);
  lines.push(` *`);
  lines.push(` * Generated by: scripts/generate-adjacent-dongs.ts`);
  lines.push(` * Data sources:`);
  lines.push(` *   - Seoul: southkorea/seoul-maps 법정동 GeoJSON (2015)`);
  lines.push(` *   - Nationwide: southkorea/southkorea-maps 행정동 GeoJSON (2013)`);
  lines.push(` * Method: Centroid distance, hybrid K=${MAX_NEIGHBORS} / max ${MAX_DISTANCE_KM}km`);
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`export const ADJACENT_DONGS: Record<string, Record<string, string[]>> = {`);

  // Sort districts for consistent output
  const sortedDistricts = [...adjacency.keys()].sort();
  for (const district of sortedDistricts) {
    const dongMap = adjacency.get(district)!;
    lines.push(`  '${district}': {`);

    const sortedDongs = [...dongMap.keys()].sort();
    for (const dong of sortedDongs) {
      const neighbors = dongMap.get(dong)!;
      const neighborsStr = neighbors.map(n => `'${n}'`).join(', ');
      lines.push(`    '${dong}': [${neighborsStr}],`);
    }

    lines.push(`  },`);
  }

  lines.push(`};`);
  return lines.join('\n');
}

// === MAIN ===
async function main() {
  console.log('=== Generating Adjacent Dong Mappings ===\n');
  console.log(`Config: K=${MAX_NEIGHBORS}, maxDist=${MAX_DISTANCE_KM}km, minNeighbors=${MIN_NEIGHBORS}\n`);

  const districtLookup = buildDistrictLookup();
  console.log(`District lookup: ${districtLookup.size} entries\n`);

  // Step 1: Process Seoul 법정동 data
  const seoulPath = path.resolve(__dirname, 'data/seoul_beopjeongdong.json');
  console.log(`Loading Seoul 법정동 data from ${seoulPath}...`);
  const seoulCentroids = processSeoulBeopjeongdong(seoulPath, districtLookup);

  // Step 2: Process nationwide 행정동 data
  const nationwidePath = path.resolve(__dirname, 'data/emd_boundaries.json');
  console.log(`\nLoading nationwide 행정동 data from ${nationwidePath}...`);
  const nationwideCentroids = processNationwideHaengjeongdong(nationwidePath, districtLookup, seoulCentroids);

  // Combine
  const allCentroids = [...seoulCentroids, ...nationwideCentroids];
  console.log(`\nTotal centroids: ${allCentroids.length} (Seoul: ${seoulCentroids.length}, non-Seoul: ${nationwideCentroids.length})`);

  // Step 3: Compute adjacency
  const adjacency = computeAdjacency(allCentroids);

  // Step 4: Generate output
  const adjacentDongsCode = generateOutput(adjacency);

  // Step 5: Read existing file and replace ADJACENT_DONGS section
  const targetFile = path.resolve(__dirname, '../lib/data/adjacent-dongs.ts');
  const existing = fs.readFileSync(targetFile, 'utf8');

  // Find and replace the ADJACENT_DONGS export
  const adjacentDongsStart = existing.indexOf('export const ADJACENT_DONGS');
  const adjacentDongsEnd = existing.indexOf('};', adjacentDongsStart) + 2;

  if (adjacentDongsStart === -1) {
    console.error('Could not find ADJACENT_DONGS in target file!');
    process.exit(1);
  }

  const newContent = existing.slice(0, adjacentDongsStart) + adjacentDongsCode + existing.slice(adjacentDongsEnd);
  fs.writeFileSync(targetFile, newContent, 'utf8');

  console.log(`\n✓ Updated ${targetFile}`);
  console.log(`  ADJACENT_DONGS replaced with ${adjacency.size} districts`);

  // Spot check: 강서구 내발산동
  const gangseo = adjacency.get('강서구');
  if (gangseo) {
    const naebalsan = gangseo.get('내발산동');
    console.log(`\n  Spot check: 강서구 내발산동 → [${naebalsan?.join(', ') || 'NOT FOUND'}]`);
  }

  // Spot check: 마포구 서교동
  const mapo = adjacency.get('마포구');
  if (mapo) {
    const seogyo = mapo.get('서교동');
    console.log(`  Spot check: 마포구 서교동 → [${seogyo?.join(', ') || 'NOT FOUND'}]`);
  }

  // Spot check: 강남구 역삼동
  const gangnam = adjacency.get('강남구');
  if (gangnam) {
    const yeoksam = gangnam.get('역삼동');
    console.log(`  Spot check: 강남구 역삼동 → [${yeoksam?.join(', ') || 'NOT FOUND'}]`);
  }
}

main().catch(console.error);
