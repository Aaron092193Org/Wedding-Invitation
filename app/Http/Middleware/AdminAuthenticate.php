<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AdminAuthenticate
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?? $request->cookie('AuthToken');

        if ($token) {
            $accessToken = PersonalAccessToken::findToken($token);

            if ($accessToken && (!$accessToken->expires_at || $accessToken->expires_at->isFuture())) {
                $tokenable = $accessToken->tokenable;
                if ($tokenable) {
                    $request->setUserResolver(fn() => $tokenable);
                    return $next($request);
                }
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Unauthenticated or session expired.',
        ], 401);
    }
}
