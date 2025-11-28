import { NextResponse } from 'next/server';
import { SEOUL_APARTMENTS, searchApartments } from '@/lib/data/address-data';

/**
 * GET /api/apartments
 * Returns all apartments or filtered results based on query parameters
 *
 * Query params:
 * - q: search query (apartment name)
 * - dong: neighborhood filter
 * - district: district filter
 * - limit: max results (default: 20)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const dong = searchParams.get('dong') || undefined;
  const district = searchParams.get('district') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    let results;

    if (query) {
      // Search apartments with filters
      results = searchApartments(query, dong, district);
    } else {
      // Return filtered or all apartments
      results = SEOUL_APARTMENTS;

      // Apply dong filter if provided
      if (dong) {
        results = results.filter(apt =>
          apt.dong === dong || (apt.dongs && apt.dongs.includes(dong))
        );
      }

      // Apply district filter if provided
      if (district) {
        results = results.filter(apt => apt.district === district);
      }
    }

    // Limit results
    const limited = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      count: limited.length,
      total: results.length,
      apartments: limited
    });
  } catch (error) {
    console.error('Error fetching apartments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch apartments' },
      { status: 500 }
    );
  }
}
