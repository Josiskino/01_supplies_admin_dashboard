<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class DistanceMatrixController extends Controller
{
    /**
     * Calculer la distance et la durée entre deux points
     * POST /api/v1/distance-matrix
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function calculate(Request $request): JsonResponse
    {
        try {
            // Log de la requête reçue pour debug
            Log::info('Distance Matrix Request', [
                'body' => $request->all(),
                'headers' => $request->headers->all()
            ]);

            $validated = $request->validate([
                'origin' => 'required|array',
                'origin.lat' => 'required|numeric|between:-90,90',
                'origin.lng' => 'required|numeric|between:-180,180',
                'destination' => 'required|array',
                'destination.lat' => 'required|numeric|between:-90,90',
                'destination.lng' => 'required|numeric|between:-180,180',
            ]);

            $googleMapsApiKey = env('GOOGLE_MAPS_API_KEY');

            if (!$googleMapsApiKey) {
                Log::error('Google Maps API Key not configured');
                return response()->json([
                    'success' => false,
                    'message' => 'Clé API Google Maps non configurée',
                    'error' => 'GOOGLE_MAPS_API_KEY_NOT_SET'
                ], 500);
            }

            $origin = $validated['origin'];
            $destination = $validated['destination'];

            $originStr = $origin['lat'] . ',' . $origin['lng'];
            $destinationStr = $destination['lat'] . ',' . $destination['lng'];

            $url = "https://maps.googleapis.com/maps/api/distancematrix/json";

            Log::info('Calling Google Maps API', [
                'url' => $url,
                'origin' => $originStr,
                'destination' => $destinationStr
            ]);

            $response = Http::timeout(10)->get($url, [
                'origins' => $originStr,
                'destinations' => $destinationStr,
                'units' => 'metric',
                'key' => $googleMapsApiKey,
            ]);

            $data = $response->json();

            Log::info('Google Maps API Response', [
                'status_code' => $response->status(),
                'response' => $data
            ]);

            if ($response->failed()) {
                Log::error('Google Maps API HTTP Error', [
                    'status' => $response->status(),
                    'response' => $data
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de l\'appel à l\'API Google Maps',
                    'error' => 'GOOGLE_MAPS_API_ERROR',
                    'status_code' => $response->status()
                ], 500);
            }

            if ($data['status'] !== 'OK') {
                Log::error('Google Maps API Status Error', [
                    'status' => $data['status'],
                    'error_message' => $data['error_message'] ?? null
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur Google Maps API: ' . $data['status'],
                    'error' => 'GOOGLE_MAPS_API_ERROR',
                    'details' => $data['error_message'] ?? null
                ], 400);
            }

            $element = $data['rows'][0]['elements'][0] ?? null;

            if (!$element || $element['status'] !== 'OK') {
                Log::error('Distance Calculation Failed', [
                    'element_status' => $element['status'] ?? 'Missing element',
                    'element' => $element
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de calculer la distance',
                    'error' => 'DISTANCE_CALCULATION_FAILED',
                    'details' => $element['status'] ?? 'Unknown error'
                ], 400);
            }

            $result = [
                'success' => true,
                'data' => [
                    'distance' => round($element['distance']['value'] / 1000, 2), // Convertir en km
                    'distance_in_meters' => $element['distance']['value'],
                    'distance_text' => $element['distance']['text'],
                    'duration' => $element['duration']['text'],
                    'duration_in_seconds' => $element['duration']['value'],
                    'origin' => [
                        'lat' => (float) $origin['lat'],
                        'lng' => (float) $origin['lng'],
                    ],
                    'destination' => [
                        'lat' => (float) $destination['lat'],
                        'lng' => (float) $destination['lng'],
                    ],
                ]
            ];

            Log::info('Distance Matrix Success', $result);

            return response()->json($result);

        } catch (ValidationException $e) {
            Log::error('Validation Error', [
                'errors' => $e->errors(),
                'request' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Données de requête invalides',
                'error' => 'VALIDATION_ERROR',
                'details' => $e->errors()
            ], 400);

        } catch (\Exception $e) {
            Log::error('Distance Matrix calculation error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'origin' => $request->input('origin'),
                'destination' => $request->input('destination'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul de la distance',
                'error' => 'INTERNAL_ERROR',
                'details' => app()->environment('local') ? $e->getMessage() : null
            ], 500);
        }
    }
}
