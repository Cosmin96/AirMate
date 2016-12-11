<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Socialite;
use App\User;
use Auth;
use Illuminate\Http\Request;

class LoginController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Login Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles authenticating users for the application and
    | redirecting them to your home screen. The controller uses a trait
    | to conveniently provide its functionality to your applications.
    |
    */

    use AuthenticatesUsers;

    /**
     * Where to redirect users after login.
     *
     * @var string
     */
    protected $redirectTo = '/home';

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('guest', ['except' => 'logout']);
    }

    /**
     * Redirect the user to the Facebook authentication page.
     *
     * @return Response
     */
    public function redirectToProvider(Request $request, $provider)
    {
        return Socialite::driver($provider)->redirect();
    }

    /**
     * Obtain the user information from Facebook.
     *
     * @return Response
     */
    public function handleProviderCallback(Request $request, $provider)
    {
        try {
            $user = Socialite::driver($provider)->user();
        } catch (Exception $e) {
            return redirect('/');
        }

        $id = $user->id;
        $name = $user->name;
        $avatar = $user->avatar;
        $email = ($user->email == null) ? 'placeholder@placeholder.com' : $user->email;

        $u = User::where('provider_id', '=', $id)->where('provider', '=', $provider)->first();
        if($u == null){
            $u = User::create([
                'provider_id' => $id,
                'name' => $name, 
                'email' => $email,
                'avatar' => $avatar,
                'provider' => $provider,
            ]);
        }

        Auth::login($u, true);
        return redirect()->route('home');
    }
}
