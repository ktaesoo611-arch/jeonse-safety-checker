/**
 * POST /api/building-registry/detect
 *
 * Detects building type using the 건축물대장 (Building Registry) API
 *
 * Request Body:
 * - sigunguCd: string (district code, e.g., "11680")
 * - bjdongCd: string (dong code, e.g., "10900")
 * - bun: string (main lot number)
 * - ji: string (sub lot number, optional)
 *
 * Response:
 * - success: boolean
 * - buildingType: 'apartment' | 'multifamily' | 'officetel' | 'unknown'
 * - buildingName: string | null
 * - floorCount: number | null
 * - supported: boolean (true if building type is supported for analysis)
 */

import { NextRequest, NextResponse } from 'next/server';
import { BuildingRegistryAPI } from '@/lib/apis/building-registry';

interface DetectRequest {
  sigunguCd: string;
  bjdongCd: string;
  bun: string;
  ji?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectRequest = await request.json();

    // Validate required fields
    if (!body.sigunguCd || !body.bjdongCd || !body.bun) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sigunguCd, bjdongCd, bun' },
        { status: 400 }
      );
    }

    // Initialize Building Registry API
    const apiKey = process.env.BUILDING_REGISTRY_API_KEY;
    if (!apiKey) {
      console.warn('[BuildingRegistry] API key not configured');
      return NextResponse.json({
        success: false,
        error: 'Building Registry API not configured'
      });
    }

    const buildingRegistryAPI = new BuildingRegistryAPI(apiKey);

    // Fetch building info
    const result = await buildingRegistryAPI.getBuildingInfo(
      body.sigunguCd,
      body.bjdongCd,
      body.bun,
      body.ji
    );

    if (!result.success || !result.data) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Building not found'
      });
    }

    const supportedTypes = ['apartment', 'multifamily', 'officetel'];
    const isSupported = supportedTypes.includes(result.data.buildingType);

    return NextResponse.json({
      success: true,
      buildingType: result.data.buildingType,
      buildingName: result.data.buildingTypeName, // Korean name like "아파트", "연립주택", "오피스텔"
      floorCount: result.data.groundFloorCount || null,
      supported: isSupported,
      isResidentialOfficetel: result.data.isResidentialOfficetel,
      detectionSource: result.data.detectionSource || null,
      ...(!isSupported ? {
        message: `${result.data.buildingTypeName || result.data.buildingType}은(는) 현재 서비스 지원 대상이 아닙니다. 아파트, 연립/다세대/단독/다가구 주택, 또는 오피스텔만 분석 가능합니다.`
      } : {})
    });
  } catch (error) {
    console.error('[BuildingRegistry] Detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect building type' },
      { status: 500 }
    );
  }
}
