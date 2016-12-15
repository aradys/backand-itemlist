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
      var dev_id = "0"
      if (ionic.Platform.isIOS())
        dev_id = "1";

      function createInstance() {
        var object = new Object();
        object.toDelete = JSON.parse(localStorage.getItem("toDelete"));
        if (!object.toDelete) {
          object.toDelete = [];
        }
        object.localItems = JSON.parse(localStorage.getItem("localItems"));
        if (!object.localItems) {
          object.localItems = [];
        }
        object.localDevices = JSON.parse(localStorage.getItem("localDevices"));
        if (!object.localDevices) {
          object.localDevices = [];
        }
        object.fromServer = JSON.parse(localStorage.getItem("fromServer"));
        if (!object.fromServer) {
          object.fromServer = [];
        }
        object.newLocal = JSON.parse(localStorage.getItem("newLocal"));
        if (!object.newLocal) {
          object.newLocal = [];
        }

        object.synchronize = function (callback) {
          var promises = [];
          instance.newLocal.forEach(function (object) {
            promises.push($http.post(getUrl(), object));
            instance.fromServer = $http.get(getUrl())
              .then(function (response) {
                instance.localItems = response.data.data;
                instance.localItems.forEach(function (loc) {
                  if (loc.name == object.name) {
                    object.id = loc.id;
                    instance.localDevices.push({item_id: object.id, device_id: dev_id, amount: object.rem_amount});
                    $http.post(getDeviceUrl(), {item_id: object.id, device_id: dev_id, amount: object.rem_amount});
                  }
                })
              });
            promises.push(instance.fromServer);
          });

          instance.localDevices.forEach(function (object) {
            var result;
            var device = getItemFromDevice(object.item_id, dev_id)
              .then(function (response) {
                result = response.data.data;
                console.log(result);
                // });
                if (typeof result !== 'undefined') {
                  console.log("my id: " + dev_id);
                  console.log(result);
                  if (result.length == 0) {
                    $http.post(getDeviceUrl(), object);
                    console.log("jeszcze nie ma");
                  }
                  result.forEach(function (res) {
                    if (typeof result !== 'undefined')
                      if (res.device_id == dev_id) {
                        $http.put(getDeviceUrlForId(res.id), object);
                        console.log("juz jest");
                      }
                  })
                }
              });
            promises.push(device);
          });
          instance.toDelete.forEach(function (id) {
            console.log(id);
            promises.push($http.delete(getUrlForId(id)));
            var device = getItemFromDevice(id, dev_id);
            if (typeof device !== 'undefined')
              $http.delete(getDeviceUrlForId(device.id));
            instance.localItems.forEach(function (item) {
              if (item.id == id) {
                var index = instance.localItems.indexOf(item);
                instance.localItems.splice(index, 1);
              }
            })
            instance.localDevices.forEach(function (item) {
              if (item.item_id == id) {
                var index = instance.localItems.indexOf(item);
                instance.localItems.splice(index, 1);
              }
            })
          });
          instance.newLocal = [];
          instance.toDelete = [];
          instance.localDevices = [];

          promises.push($http.get(getUrl()).then(function (result) {
            instance.fromServer = result;
            callback();
          }));
          saveAll();
          return Promise.all(promises).then(function () {
            return $http.get(getUrl());
          });
        };

        object.add = function (object) {
          instance.newLocal.push(object);
          saveAll();
        };

        object.increase = function (object) {
          console.log(object);
          var index1 = instance.newLocal.indexOf(object);
          if (index1 > -1) {
            instance.newLocal[index1].rem_amount = parseInt(instance.newLocal[index1].rem_amount) + 1;
          } else {
            console.log(instance.localDevices);
            object.rem_amount += 1;
            var onLocalDevice = 0;
            instance.localDevices.forEach(function (locAm) {
              if (locAm.item_id == object.id && locAm.device_id == dev_id) {
                locAm.amount = parseInt(locAm.amount) + 1;
                onLocalDevice = 1;
                console.log(locAm.amount);
              }
            });
            if (!onLocalDevice) {
              object.rem_amount += 1;
              instance.localDevices.push({item_id: object.id, device_id: dev_id, amount: object.rem_amount});
            }
          }
          saveAll();
        };

        object.decrease = function (object) {
          // console.log(object);
          var index1 = instance.newLocal.indexOf(object);
          if (index1 > -1) {
            instance.newLocal[index1].rem_amount = parseInt(instance.newLocal[index1].rem_amount) - 1;
          } else {
            // console.log(instance.localDevices);
            object.rem_amount -= 1;
            instance.localDevices.forEach(function (locAm) {
              if (locAm.item_id == object.id && locAm.device_id == dev_id) {
                locAm.amount = parseInt(locAm.amount) - 1;
                console.log(locAm.amount);
              }
            });
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
        };
        return object;
      }

      function saveAll() {
        var storageInstance = StorageModule.getInstance();

        console.log('saving:');
        localStorage.setItem("toDelete", JSON.stringify(storageInstance.toDelete));
        console.log('toDelete:');
        console.log(JSON.stringify(storageInstance.toDelete));
        localStorage.setItem("fromServer", JSON.stringify(storageInstance.fromServer.data));
        console.log('fromServer:');
        console.log(JSON.stringify(storageInstance.fromServer));
        localStorage.setItem("newLocal", JSON.stringify(storageInstance.newLocal));
        console.log('newLocal:');
        console.log(JSON.stringify(storageInstance.newLocal));
        localStorage.setItem("localItems", JSON.stringify(storageInstance.localItems));
        console.log('localItems:');
        console.log(JSON.stringify(storageInstance.localItems));
        localStorage.setItem("localDevices", JSON.stringify(storageInstance.localDevices));
        console.log('localDevices:');
        console.log(JSON.stringify(storageInstance.localDevices));
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

    function getDeviceUrl() {
      return Backand.getApiUrl() + baseUrl + 'device/';
    }

    function getUrlForId(id) {
      return getUrl() + id;
    }

    function getDeviceUrlForId(id) {
      return getDeviceUrl() + id;
    }

    function getItemFromDevice(id, did) {
      return $http({
        method: 'GET',
        url: Backand.getApiUrl() + '/1/objects/device',
        params: {
          pageSize: 20,
          pageNumber: 1,
          filter: [
            {
              fieldName: 'item_id',
              operator: 'in',
              value: id
            },
            {
              fieldName: 'device_id',
              operator: 'equals',
              value: did
            }
          ],
          sort: ''
        }
      })
    }

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

    // service.create = function (object) {
    //   object.username = Backand.getUsername();
    //   var storageInstance = StorageModule.getInstance();
    //   storageInstance.add(object);
    //   return new Promise(function (resolve, reject) {
    //     resolve("Success!");
    //   });
    // };

    service.create = function (object) {
      object.username = Backand.getUsername();
      var storageInstance = StorageModule.getInstance();
      storageInstance.add(object);
    };

    service.inc = function (id, object) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.increase(object);
    };

    service.dec = function (id, object) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.decrease(object);
    };

    service.delete = function (id) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.del(id);
    };

    service.sync = function (callback) {
      var storageInstance = StorageModule.getInstance();
      storageInstance.synchronize(callback);
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
