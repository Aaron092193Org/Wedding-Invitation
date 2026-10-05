<?php

namespace App\Http\Controllers;

use App\Models\AdminUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $username = trim($request->input('username'));
        $password = $request->input('password');

        // Check AdminUser table
        $admin = AdminUser::where('Username', $username)
            ->orWhere('Email', $username)
            ->first();

        // Check Laravel User table
        $user = User::where('email', $username)
            ->orWhere('name', $username)
            ->first();

        $authenticated = false;

        if ($admin && Hash::check($password, $admin->PasswordHash)) {
            $authenticated = true;
            $admin->update(['LastLogin' => now()]);
        } elseif ($user && Hash::check($password, $user->password)) {
            $authenticated = true;
        }

        if (!$authenticated) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password.',
            ], 401);
        }

        // Ensure a User model exists for Sanctum tokens
        if (!$user) {
            $user = User::firstOrCreate(
                ['email' => $admin->Email ?? 'admin@wedding.local'],
                [
                    'name' => $admin->FullName ?? 'Wedding Administrator',
                    'password' => $admin->PasswordHash ?? Hash::make($password),
                ]
            );
        }

        $token = $user->createToken('admin-token', ['*'], now()->addDays(7))->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'username' => $admin->Username ?? 'admin',
            'fullName' => $admin->FullName ?? ($user->name ?? 'Wedding Administrator'),
            'role' => 'Admin',
            'expiresAt' => now()->addDays(7)->toIso8601String(),
            'message' => 'Login successful.',
        ])->cookie('AuthToken', $token, 60 * 24 * 7, '/', null, false, true);
    }

    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()?->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ])->withoutCookie('AuthToken');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $admin = AdminUser::where('Email', $user->email ?? '')
            ->orWhere('Username', 'admin')
            ->first();

        return response()->json([
            'success' => true,
            'username' => $admin->Username ?? 'admin',
            'email' => $admin->Email ?? ($user->email ?? 'admin@wedding.local'),
            'fullName' => $admin->FullName ?? ($user->name ?? 'Wedding Administrator'),
            'role' => 'Admin',
        ]);
    }
}
