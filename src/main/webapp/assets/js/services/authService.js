/**
 * Created by Suny on 7/6/16.
 */

app.service('AuthService', function ($http, GATEWAY, MessageService) {
    var localAuthCacheKey = 'STAP_AUTH_CACHE';
    var authService = {};
    var authResult = {};

    function loadAuthCache() {
        var authResultCache = window.localStorage.getItem(localAuthCacheKey);
        if(authResultCache){
            useAuthCache(authResultCache);
        }
    }

    function writeAuthCache(authResult) {
        var authResultCache = JSON.stringify(authResult)
        window.localStorage.setItem(localAuthCacheKey, authResultCache);
        useAuthCache(authResultCache)
    }

    function useAuthCache(authResultCache) {
        authResult = JSON.parse(authResultCache);
        if(authResult && authResult.userDto) {
            $http.defaults.headers.common['Stap-User'] = authResult.userDto.name;
            $http.defaults.headers.common['Stap-Token'] = authResult.token;
        }
    }

    function destroyAuthCache() {
        authResult = {};
        window.localStorage.removeItem(localAuthCacheKey);
        $http.defaults.headers.common['Stap-User'] = undefined;
        $http.defaults.headers.common['Stap-Token'] = undefined;
    }

    authService.login = function (credentials) {
        return $http.post(GATEWAY.gatewayUrl + '/authorize', credentials)
            .then(function (res) {
                writeAuthCache(res.data);
                return res.data;
            }, function () {
            });
    };

    authService.logout = function () {
        destroyAuthCache();
    }

    authService.isAuthenticated = function () {
        return !!authResult.token;
    };

    authService.isAuthorized = function (authorizedRoles) {
        if (!angular.isArray(authorizedRoles)) {
            authorizedRoles = [authorizedRoles];
        }
        return (authService.isAuthenticated() && authorizedRoles.indexOf(authResult.userDto.role) !== -1);
    };

    authService.userProfile = function () {
        return authResult.userDto;
    }

    loadAuthCache();
    return authService;
});

app.run(function ($rootScope, $state, AUTH_EVENTS, AuthService) {
    $rootScope.$on('$stateChangeStart', function (event, next, nextParams, fromState) {
        if('data' in next && 'authorizedRoles' in next.data){
            var authorizedRoles = next.data.authorizedRoles;
            if(!AuthService.isAuthorized(authorizedRoles)){
                event.preventDefault();
                $state.go($state.current, {}, {reload: true});
            }
        }

        if(!AuthService.isAuthenticated()) {
            if(next.name !== "login.signin"){
                $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
            }
        }
    });
    $rootScope.$on(AUTH_EVENTS.notAuthorized, function (event) {
        event.preventDefault();
        $state.go('login.signin');
    });
    $rootScope.$on(AUTH_EVENTS.notAuthenticated, function (event) {
        event.preventDefault();
        $state.go('login.signin');
    });
});