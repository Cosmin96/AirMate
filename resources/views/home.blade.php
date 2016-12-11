<!DOCTYPE html>
<html>
<head>
  <!-- Site made with Mobirise Website Builder v3.10, https://mobirise.com -->
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="generator" content="Mobirise v3.10, mobirise.com">
  <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="shortcut icon" href="{{ asset('landing-assets/images/logo-314x128-90.png') }}" type="image/x-icon">
<meta name="csrf-token" content="{{ csrf_token() }}">
  
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lora:400,700,400italic,700italic&amp;subset=latin">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat:400,700">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Raleway:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i">
  <link rel="stylesheet" href="{{ asset('landing-assets/bootstrap-material-design-font/css/material.css') }}">
  <link rel="stylesheet" href="{{ asset('landing-assets/tether/tether.min.css') }}">
  <link rel="stylesheet" href="{{ asset('landing-assets/bootstrap/css/bootstrap.min.css') }}">
  <link rel="stylesheet" href="{{ asset('landing-assets/animate.css/animate.min.css') }}">
  <link rel="stylesheet" href="{{ asset('landing-assets/dropdown/css/style.css') }}">
  <link rel="stylesheet" href="{{ asset('landing-assets/socicon/css/socicon.min.css') }}">
  <link rel="stylesheet" href="{{ asset('landing-assets/theme/css/style.css') }}">
  <link rel="stylesheet" href="{{ asset('landing-assets/mobirise/css/mbr-additional.css') }}" type="text/css">
  
  <script>
        window.Laravel = <?php echo json_encode([
            'csrfToken' => csrf_token(),
        ]); ?>
    </script>
  
</head>
<body>

  <form id="logout-form" action="{{ url('/logout') }}" method="POST" style="display: none;">
                                            {{ csrf_field() }}
                                            <input type="hidden" name="_token" value="{{ csrf_token() }}">
                                        </form>
<section id="menu-1">

    <nav class="navbar navbar-dropdown bg-color transparent navbar-fixed-top">
        <div class="container">

            <div class="mbr-table">
                <div class="mbr-table-cell">

                    <div class="navbar-brand">
                        <a href="#" class="navbar-logo"><img src="{{ asset('landing-assets/images/logo-314x128-90.png')}} " alt="Mobirise"></a>
                        
                    </div>

                </div>
                <div class="mbr-table-cell">

                    <button class="navbar-toggler pull-xs-right hidden-md-up" type="button" data-toggle="collapse" data-target="#exCollapsingNavbar">
                        <div class="hamburger-icon"></div>
                    </button>

                    <ul class="nav-dropdown collapse pull-xs-right nav navbar-nav navbar-toggleable-sm" id="exCollapsingNavbar">
                      <li class="nav-item dropdown"><a class="nav-link link" href="#" aria-expanded="false"></a></li>
                      <li class="nav-item nav-btn"><a class="nav-link btn btn-white-outline btn-white" href="{{ url('/logout') }}" onclick="event.preventDefault();
                                                     document.getElementById('logout-form').submit();"><span style="font-size: 19.200000762939453px; font-weight: normal; line-height: 9.600000381469727px;">Logout</span></font></a></li></ul>
                    <button hidden="" class="navbar-toggler navbar-close" type="button" data-toggle="collapse" data-target="#exCollapsingNavbar">
                        <div class="close-icon"></div>
                    </button>

                </div>
            </div>

        </div>
    </nav>

</section>

<section class="engine"><a rel="external" href="https://mobirise.com">simple bootstrap web page maker</a></section><section class="mbr-section mbr-section-hero mbr-section-full mbr-parallax-background mbr-section-with-arrow mbr-after-navbar" id="header1-4" style="background-image: url({{ asset('landing-assets/images/1a6cafd3a0a79e60e39b6bdff215dd67-2000x1250-41.jpg') }});">

    <div class="mbr-overlay" style="opacity: 0.5; background-color: rgb(0, 0, 0);"></div>

    <div class="mbr-table-cell">

        <div class="container">
            <div class="row">
                <div class="mbr-section col-md-10 col-md-offset-1 text-xs-center">

                    <h1 class="mbr-section-title display-1">Welcome, {{ Auth::user()->name }}!</h1>
                    <p class="mbr-section-lead lead">Please search your airport and flight details in the form below</p>
                    
                </div>
            </div>
        </div>
    </div>

    <div class="mbr-arrow mbr-arrow-floating" aria-hidden="true"><a href="#content1-5"><i class="mbr-arrow-icon"></i></a></div>

</section>

<section class="mbr-section article mbr-section__container" id="content1-5" style="background-color: rgb(255, 255, 255); padding-top: 20px; padding-bottom: 20px;">

    <div class="container">
        <div class="row">
          <form class="form-horizontal form-label-left">
            <div class="form-group">
                        <label class="control-label col-md-3 col-sm-3 col-xs-12">Departure</label>
                        <div class="col-md-9 col-sm-9 col-xs-12">
                          <select class="form-control">
                            <option>Choose option</option>
                            <option>London Heathrow</option>
                            <option>London Gatwick</option>
                            <option>London Stansted</option>
                            <option>London Luton</option>
                            <option>Manchester MAN</option>
                            <option>Edinburgh</option>
                            <option>Paris Charles de Gaulle</option>
                            <option>Paris Orly</option>
                            <option>Munchen</option>
                            <option>Amsterdam</option>
                            <option>Rotterdam</option>
                            <option>Berlin Schonefeld</option>
                            <option>Berlin Tegel</option>
                            <option>Los Angeles LAX</option>
                            <option>New York JFK</option>
                            <option>Barcelona</option>
                            <option>Madrid</option>
                          </select>
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="control-label col-md-3 col-sm-3 col-xs-12">Destination</label>
                        <div class="col-md-9 col-sm-9 col-xs-12">
                          <select class="form-control">
                            <option>Choose option</option>
                            <option>London Heathrow</option>
                            <option>London Gatwick</option>
                            <option>London Stansted</option>
                            <option>London Luton</option>
                            <option>Edinburgh</option>
                            <option>Paris Charles de Gaulle</option>
                            <option>Paris Orly</option>
                            <option>Munchen</option>
                            <option>Amsterdam</option>
                            <option>Rotterdam</option>
                            <option>Berlin Schonefeld</option>
                            <option>Berlin Tegel</option>
                            <option>Los Angeles LAX</option>
                            <option>New York JFK</option>
                            <option>Barcelona</option>
                            <option>Madrid</option>
                          </select>
                        </div>
                      </div>
                      
                     

                      <div class="control-group">
                       
                        <div class="form-group">
                        <label class="control-label col-md-3 col-sm-3 col-xs-12">Flight Number</label>
                        <div class="col-md-9 col-sm-9 col-xs-12">
                          <input type="text" class="form-control" placeholder="Default Input">
                        </div>
                      </div>
                      </div>
                     
                      </div>

                      
                      


                      <div class="ln_solid"></div>
                      <div class="form-group">
                        <div class="col-md-9 col-sm-9 col-xs-12 col-md-offset-3">
                          
                          <button type="submit" class="btn btn-success">Apply</button>
                        </div>
                      </div>

                    </form>
            
        </div>
    </div>

</section>


    <script src="{{ asset('landing-assets/jquery/jquery.min.js') }}"></script>
  <script src="{{ asset('landing-assets/tether/tether.min.js') }}"></script>
  <script src="{{ asset('landing-assets/bootstrap/js/bootstrap.min.js') }}"></script>
  <script src="{{ asset('landing-assets/smooth-scroll/SmoothScroll.js') }}"></script>
  <script src="{{ asset('landing-assets/viewportChecker/jquery.viewportchecker.js') }}"></script>
  <script src="{{ asset('landing-assets/dropdown/js/script.min.js') }}"></script>
  <script src="{{ asset('landing-assets/touchSwipe/jquery.touchSwipe.min.js') }}"></script>
  <script src="{{ asset('landing-assets/jarallax/jarallax.js') }}"></script>
  <script src="{{ asset('landing-assets/theme/js/script.js') }}"></script>
  
  
  <input name="animation" type="hidden">
  </body>
</html>