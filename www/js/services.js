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
        object.localAmounts = JSON.parse(localStorage.getItem("localAmounts"));
        if (!object.localAmounts) {
          object.localAmounts = [];
        }
        object.serverAmounts = JSON.parse(localStorage.getItem("serverAmounts"));
        if (!object.serverAmounts) {
          object.serverAmounts = [];
        }
        object.fromServer = JSON.parse(localStorage.getItem("fromServer"));
        if (!object.fromServer) {
          object.fromServer = [];
        }
        object.newLocal = JSON.parse(localStorage.getItem("newLocal"));
        if (!object.newLocal) {
          object.newLocal = [];
        }

        object.synchronize = function () {
          console.log("andro " + ionic.Platform.isAndroid());
          console.log("ios " + ionic.Platform.isIOS());
          instance.fromServer = $http.get(getUrl());
          instance.serverAmounts = $http.get(getDeviceUrl());
          instance.newLocal.forEach(function (object) {
            $http.post(getUrl(), object);
          });
          instance.localAmounts.forEach(function (object) {
              // object.rem_amount = object.amount;
              // object.delta = 0;
            $http.put(getUrlForId(object.id), object);
          });
          instance.toDelete.forEach(function (id) {
            $http.delete(getUrlForId(id));
          });
          instance.newLocal = [];
          instance.localAmounts = [];
          instance.toDelete = [];
          instance.toChange = [];
          saveAll();
        };

        object.add = function (object) {
          object.rem_amount = object.amount;
          object.delta = 0;
          instance.newLocal.push(object);
          saveAll();
        };

        object.increase = function (object) {
            var index = instance.newLocal.indexOf(object);
            if (index > -1) {
              instance.newLocal[index].amount = parseInt(instance.newLocal[index].amount) + 1;
              instance.newLocal[index].rem_amount = parseInt(instance.newLocal[index].rem_amount) + 1;
            } else {
              var onLocalAmounts = 0;
              instance.localAmounts.forEach(function (locAm){
                if (locAm.id == object.id){
                  object.delta = parseInt(object.delta) + 1;
                  onLocalAmounts = 1;
                  console.log(object.delta);
                }
              });
              if (!onLocalAmounts) {
                object.delta = parseInt(object.delta) + 1;
                instance.localAmounts.push(object);
              }
          }
          saveAll();
        };

        object.decrease = function (object) {
          var index = instance.newLocal.indexOf(object);
          if (index > -1) {
            instance.newLocal[index].amount = parseInt(instance.newLocal[index].amount) - 1;
            instance.newLocal[index].rem_amount = parseInt(instance.newLocal[index].rem_amount) - 1;
          } else {
            var onLocalAmounts = 0;
            instance.localAmounts.forEach(function (locAm){
              if (locAm.id == object.id){
                object.delta = parseInt(object.delta) - 1;
                onLocalAmounts = 1;
                console.log(object.delta);
              }
            });
            if (!onLocalAmounts) {
              object.delta = parseInt(object.delta) - 1;
              instance.localAmounts.push(object);
            }
          }
          saveAll();
        };

        object.del = function (id) {

          var newDeletable = [];
          var newItem = 0;
          instance.newLocal.forEach(function (local) {
            if (local.id == id) {
              newDeletable.push(local);
              newItem = 1;
            }
          });
          if (newItem) {
            newDeletable.forEach(function (del) {
              var index = instance.newLocal.indexOf(del);
              if (index > -1) {
                instance.newLocal.splice(index, 1);
              }
            });
          } else {
            object.toDelete.push(id);
          }
          saveAll();
        };

        object.all = function () {
          return object.fromServer;
          // return $http.get(getUrl());
        };
        return object;
      }

      function saveAll() {
        var storageInstance = StorageModule.getInstance();

        localStorage.setItem("toDelete", JSON.stringify(storageInstance.toDelete));
        localStorage.setItem("fromServer", JSON.stringify(storageInstance.fromServer));
        localStorage.setItem("newLocal", JSON.stringify(storageInstance.newLocal));
        localStorage.setItem("localAmounts", JSON.stringify(storageInstance.localAmounts));
        localStorage.setItem("serverAmounts", JSON.stringify(storageInstance.serverAmounts));
        localStorage.setItem("toChange", JSON.stringify(storageInstance.toChange));
      }

      return {
        getInstance: function () {
          if (!instance) {
            instance = createInstance();
          }
          return instance;
        }
      };
    })();


    function getUrl() {
      return Backand.getApiUrl() + baseUrl + objectName;
    }

    function getDeviceUrl(){
      return Backand.getApiUrl() + baseUrl + 'device/';
    }

    function getUrlForId(id) {
      return getUrl() + id;
    }

    function getDeviceUrlForId(id) {
      return getDeviceUrl() + id;
    }

    // function getIdFromDeviceTable(id){
    //   // var storageInstance = StorageModule.getInstance();
    //   // return storageInstance.all().filter(function (id) {
    //     return $http({
    //       method: 'GET',
    //       url: baseUrl + "device/",
    //       params: {
    //         filter: JSON.stringify([{
    //           fieldName: "item_id",
    //           operator: "in",
    //           value: id
    //         }])
    //       }
    //     }).then(function (response) {
    //       if (response.data && response.data.data && response.data.data.length == 1)
    //         return response.data.data[0];
    //     });
    //   }

    // service.getIdFromDeviceTable = function (id){
    // // function getIdFromDeviceTable (id){
    //   return $http({
    //     method: 'GET',
    //     url: baseUrl + "device/",
    //     params: {
    //       filter: JSON.stringify([{
    //         fieldName: "item_id",
    //         operator: "in",
    //         value: id
    //       }])
    //     }
    //   })
    // };

    service.getIdFromDeviceTable = function (id){
      var storageInstance = StorageModule.getInstance();
      storageInstance.getId(object);
      return new Promise(function (resolve, reject) {
        resolve("Success!");
      });
    };

    service.all = function () {
      var storageInstance = StorageModule.getInstance();
      return new Promise(function (resolve, reject) {
        resolve(storageInstance.all());
      });
    };

    service.local = function () {
      var storageInstance = StorageModule.getInstance();
      return storageInstance.newLocal;
    };

    service.remote = function () {
      var storageInstance = StorageModule.getInstance();
      return storageInstance.fromServer;
    };

    service.amounts = function () {
      var storageInstance = StorageModule.getInstance();
      console.log(storageInstance.localAmounts);
      return storageInstance.localAmounts;
    };

    service.deletable = function () {
      var storageInstance = StorageModule.getInstance();
      return storageInstance.toDelete;
    };

    service.fetch = function (id) {
      var storageInstance = StorageModule.getInstance();
      return storageInstance.all().filter(function (obj) {
        return obj.id = id
      });
    };

    service.create = function (object) {
      object.username = Backand.getUsername();
      object.id = object.name;
      // object.rem_amount = 0;
      var storageInstance = StorageModule.getInstance();
      storageInstance.add(object);
      return new Promise(function (resolve, reject) {
        resolve("Success!");
      });
    };

    // do usuniecia
    // service.update = function (id, object) {
    //   var storageInstance = StorageModule.getInstance();
    //   storageInstance.change(object);
    //   return new Promise(function (resolve, reject) {
    //     resolve("Success!");
    //   });
    // };

    service.inc = function (id, object) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.increase(object);
      return new Promise(function (resolve, reject) {
        resolve("Success!");
      });
    };

    service.dec = function (id, object) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.decrease(object);
      return new Promise(function (resolve, reject) {
        resolve("Success!");
      });
    };

    service.delete = function (id) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.del(id);
      return new Promise(function (resolve, reject) {
        resolve("Success!");
      });
    };

    service.sync = function () {
      var storageInstance = StorageModule.getInstance();
      storageInstance.synchronize();
      return new Promise(function (resolve, reject) {
        resolve("Success!");
      });
    };
  })


  .service('LoginService', function (Backand) {
    var service = this;

    service.signin = function (email, password, appName) {
      return Backand.signin(email, password);
    };

    service.anonymousLogin = function () {
      // don't have to do anything here,
      // because we set app token att app.js
    };

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
    self.appName = '';
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
