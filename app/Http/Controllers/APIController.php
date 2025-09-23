<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class APIController extends Controller
{
    public function sendError($error, $errorMessages = [], $code = 404)
    {
        $response = [
            'success' => false,
            'message' => $error,
        ];

        if (!empty($errorMessages)) {
            $response['data'] = $errorMessages;
        }
        return response()->json($response, $code);
    }

    public function sendResponse($result, $message)
    {
        $response = [
            'success' => true,
            'data'    => $result,
            'message' => $message,
        ];
        return response()->json($response, 200);
    }

    // custom login 
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:250',
            'password' => 'required|max:250',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 400);
        }

        $user = User::where('username', $request->username)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Username not found',
            ], 401);
        }
        // Decrypt password from frontend
        $secret = 'mySecretKey12345'; // 16 chars, must match frontend
        $decryptedPassword = null;
        try {
            // Convert from base64 to binary, then decrypt
            $decrypted = openssl_decrypt(
                base64_decode($request->password),
                'AES-128-ECB',
                $secret,
                OPENSSL_RAW_DATA
            );
            $decryptedPassword = $decrypted ?: $request->password;
        } catch (\Exception $e) {
            $decryptedPassword = $request->password;
        }
        if (!Hash::check($decryptedPassword, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password',
            ], 401);
        }
        // $user->tokens()->delete(); // Allow multiple device/tab login
        $token = $user->createToken('auth_token')->plainTextToken;
        return response()->json([
            'success' => true,
            'data' => $user,
            'token' => $token,
            'message' => 'success',
        ], 200);
    }

    // Logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out'], 200);
    }

    // custom register
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return $this->sendResponse(400, $validator->errors()->first());
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        if ($user) {
            return $this->sendResponse($user, "success");
        }
    }

    // password forget
    public function forget_pass(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        if ($validator->fails()) {
            return $this->sendResponse(400, $validator->errors()->first());
        }

        $token_str = Str::random(64);

        try {
            //code...
            $url = env('APP_URL');
            $token = $url."reset-password/".$token_str;
            Mail::send('email.forgetPassword', ['token' => $token], function ($message) use ($request) {
                $message->to($request->email);
                $message->subject('Reset Password');
            });

            DB::table('password_resets')->insert([
                'email' => $request->email,
                'token' => $token_str,
                'created_at' => Carbon::now()
            ]);

            return $this->sendResponse(null, "success");
        } catch (\Throwable $th) {
            return $this->sendResponse(400, "Something went wrong, please contact support.");
        }
    }

    // reset password
    public function reset_pass(Request $request) {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
            'token' => ['required', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return $this->sendResponse(400, $validator->errors()->first());
        }

        try {
            $updatePassword = DB::table('password_resets')->where(['email' => $request->email, 'token' => $request->token])->first();

            if(!$updatePassword){
                return $this->sendResponse(400, 'Invalid token.');
            }

            // update users password
            User::where('email', $request->email)->update(['password' => Hash::make($request->password)]);

            // delete old data from database
            DB::table('password_resets')->where(['email'=> $request->email])->delete();

            return $this->sendResponse(null, "success");
        } catch (\Throwable $th) {
            return $this->sendResponse(400, "Something went wrong, please contact support.");
        }
    }
}
