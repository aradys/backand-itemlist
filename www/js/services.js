angular.module('shoplist.services', [])

  .service('APIInterceptor', function ($rootScope, $q) {
    var service = this;

    service.responseError = function (response) {
      if (response.status === 401) {
        $rootScope.$broadcast('unauthorized');
      }
      return $q.reject(response);
    };
  })

  .service('ItemsModel', function ($http, Backand) {
    var service = this,
      baseUrl = '/1/objects/',
      objectName = 'items/';

    var StorageModule = (function () {
      var instance;

      function createInstance() {
        var object = new Object();
        object.toDelete = JSON.parse(localStorage.getItem("toDelete"));
        if (!object.toDelete) {
          object.toDelete = [];
        }
        object.fromServer = JSON.parse(localStorage.getItem("fromServer"));
        if (!object.fromServer) {
          object.fromServer = [];
        }

        object.synchronize = function () {
          instance.fromServer = $http.get(getUrl());
          instance.toDelete.forEach(function (id) {
            console.log(id);
            $http.delete(getUrlForId(id));
          });
          instance.toDelete = [];
          saveAll();
        };

        object.del = function (id) {
          console.log(id);
          // jezeli jest tylko na urzadzeniu to usuwamy z tej listy i zapominamy o sprawie
          // w przeciwnym wypadku:
          object.toDelete.push(id);
          saveAll();
        };

        object.all = function () {
          return instance.fromServer;
        };

        return object;
      }

      function saveAll() {
        var storageInstance = StorageModule.getInstance();
        console.log(storageInstance.toDelete);
        localStorage.setItem("toDelete", JSON.stringify(storageInstance.toDelete));
        console.log(storageInstance.fromServer);
        localStorage.setItem("fromServer", JSON.stringify(storageInstance.fromServer));
      }

      return {
        getInstance: function () {
          if (!instance) {
            instance = createInstance();
            instance.synchronize(); //usunąć synchronizację stąd i podpiąć pod przycisk
          }
          return instance;
        }
      };
    })();


    function getUrl() {
      return Backand.getApiUrl() + baseUrl + objectName;
    }

    function getUrlForId(id) {
      return getUrl() + id;
    }

    service.all = function () {
      var storageInstance = StorageModule.getInstance();
      return storageInstance.all();
    };

    service.fetch = function (id) {

      var storageInstance = StorageModule.getInstance();
      return storageInstance.all().filter(function (obj) {
        return obj.id = id
      });
    };

    service.create = function (object) {
      object.username = Backand.getUsername();
      // dodanie do listy produktów ktore są tylko na urządzeniu
      return $http.post(getUrl(), object);
    };

    service.update = function (id, object) {
      // musisz sprawdzić czy jest tylko na urządzeniue czy też na serwerze i zmodyfikować odpowiedni obiekt
      return $http.put(getUrlForId(id), object);
    };

    service.inc = function (id, object) {
      // j.w.
      return $http.put(getUrlForId(id), object);
    };

    service.dec = function (id, object) {
      // j.w.
      return $http.put(getUrlForId(id), object);
    };

    service.delete = function (id) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.del(id);
      return new Promise(function () {
        return true;
      });
    };
  })

  .service('LoginService', function (Backand) {
    var service = this;

    service.signin = function (email, password, appName) {

      // tutaj musisz coś wymyślić z logowaniem offline(chyba, że ionic nie wylogowuje jezeli nie było reinstalacji)
      //call Backand for sign in
      return Backand.signin(email, password);
    };

    service.anonymousLogin = function () {
      // don't have to do anything here,
      // because we set app token att app.js
    }

    service.socialSignIn = function (provider) {
      return Backand.socialSignIn(provider);
    };

    service.socialSignUp = function (provider) {
      return Backand.socialSignUp(provider);

    };

    service.signout = function () {
      return Backand.signout();
    };

    service.signup = function (firstName, lastName, email, password, confirmPassword) {
      return Backand.signup(firstName, lastName, email, password, confirmPassword);
    }
  })

  .service('AuthService', function ($http, Backand) {

    var self = this;
    var baseUrl = Backand.getApiUrl() + '/1/objects/';
    self.appName = ''; //CONSTS.appName || '';
    self.currentUser = {};

    loadUserDetails();

    function loadUserDetails() {
      self.currentUser.name = Backand.getUsername();
      if (self.currentUser.name) {
        getCurrentUserInfo()
          .then(function (data) {
            self.currentUser.details = data;
          });
      }
    }

    self.getSocialProviders = function () {
      return Backand.getSocialProviders()
    };

    self.socialSignIn = function (provider) {
      return Backand.socialSignIn(provider)
        .then(function (response) {
          loadUserDetails();
          return response;
        });
    };

    self.socialSignUp = function (provider) {
      return Backand.socialSignUp(provider)
        .then(function (response) {
          loadUserDetails();
          return response;
        });
    };

    self.setAppName = function (newAppName) {
      self.appName = newAppName;
    };

    self.signIn = function (username, password, appName) {
      return Backand.signin(username, password, appName)
        .then(function (response) {
          loadUserDetails();
          return response;
        });
    };

    self.signUp = function (firstName, lastName, username, password, parameters) {
      return Backand.signup(firstName, lastName, username, password, password, parameters)
        .then(function (signUpResponse) {

          if (signUpResponse.data.currentStatus === 1) {
            return self.signIn(username, password)
              .then(function () {
                return signUpResponse;
              });

          } else {
            return signUpResponse;
          }
        });
    };

    self.changePassword = function (oldPassword, newPassword) {
      return Backand.changePassword(oldPassword, newPassword)
    };

    self.requestResetPassword = function (username) {
      return Backand.requestResetPassword(username, self.appName)
    };

    self.resetPassword = function (password, token) {
      return Backand.resetPassword(password, token)
    };

    self.logout = function () {
      Backand.signout().then(function () {
        angular.copy({}, self.currentUser);
      });
    };

    function getCurrentUserInfo() {
      return $http({
        method: 'GET',
        url: baseUrl + "users",
        params: {
          filter: JSON.stringify([{
            fieldName: "email",
            operator: "contains",
            value: self.currentUser.name
          }])
        }
      }).then(function (response) {
        if (response.data && response.data.data && response.data.data.length == 1)
          return response.data.data[0];
      });
    }

  });
