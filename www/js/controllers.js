angular.module('shoplist.controllers', [])

  .controller('LoginCtrl', function (Backand, $state, $rootScope, LoginService) {
    var login = this;

    function signin() {
      LoginService.signin(login.email, login.password)
        .then(function () {
          onLogin();
        }, function (error) {

        })
    }

    function anonymousLogin() {
      LoginService.anonymousLogin();
      onLogin('Guest');
    }

    function onLogin(username) {
      $rootScope.$broadcast('authorized');
      $state.go('tab.dashboard');
      login.username = username || Backand.getUsername();
    }

    function signout() {
      LoginService.signout()
        .then(function () {
          //$state.go('tab.login');
          $rootScope.$broadcast('logout');
          $state.go($state.current, {}, {reload: true});
        })

    }

    function socialSignIn(provider) {
      LoginService.socialSignIn(provider)
        .then(onValidLogin, onErrorInLogin);

    }

    function socialSignUp(provider) {
      LoginService.socialSignUp(provider)
        .then(onValidLogin, onErrorInLogin);

    }

    onValidLogin = function (response) {
      onLogin();
      login.username = response.data || login.username;
    };

    onErrorInLogin = function (rejection) {
      login.error = rejection.data;
      $rootScope.$broadcast('logout');

    };

    login.username = '';
    login.error = '';
    login.signin = signin;
    login.signout = signout;
    login.anonymousLogin = anonymousLogin;
    login.socialSignup = socialSignUp;
    login.socialSignin = socialSignIn;

  })

  .controller('SignUpCtrl', function (Backand, $state, $rootScope, LoginService) {
    var vm = this;

    vm.signup = signUp;

    function signUp() {
      vm.errorMessage = '';

      LoginService.signup(vm.firstName, vm.lastName, vm.email, vm.password, vm.again)
        .then(function (response) {
          // success
          onLogin();
        }, function (reason) {
          if (reason.data.error_description !== undefined) {
            vm.errorMessage = reason.data.error_description;
          }
          else {
            vm.errorMessage = reason.data;
          }
        });
    }

    function onLogin() {
      $rootScope.$broadcast('authorized');
      $state.go('tab.dashboard');
    }

    vm.email = '';
    vm.password = '';
    vm.again = '';
    vm.firstName = '';
    vm.lastName = '';
    vm.errorMessage = '';
  })

  .controller('DashboardCtrl', function (ItemsModel, $rootScope) {
    var vm = this;

    function goToBackand() {
      window.location = 'http://docs.backand.com';
    }

    function getAll() {
      ItemsModel.all()
        .then(function (result) {
            var toDel = ItemsModel.deletable();
            if(typeof result.data !== 'undefined') {
              vm.data = result.data.data
                .filter(function (obj) {
                  return toDel.length == 0 || toDel.indexOf(obj.id) == -1;
                })
                .concat(ItemsModel.local());
              vm.data.forEach (function (obj){
                obj.amount = parseInt(obj.rem_amount) + parseInt(obj.delta);
              })
            }
          }
        );
    }

    function clearData() {
      vm.data = null;
    }

    function create(object) {
      ItemsModel.create(object)
        .then(function (result) {
          cancelCreate();
          getAll();
        });
    }

    function deleteObject(id) {
      ItemsModel.delete(id)
        .then(function (result) {
          cancelEditing();
          getAll();
        });
    }

    function initCreateForm() {
      vm.newObject = {name: '', store: '', price:'', amount:''};
    }

    function setEdited(object) {
      vm.edited = angular.copy(object);
      vm.isEditing = true;
    }

    function isCurrent(id) {
      return vm.edited !== null && vm.edited.id === id;
    }

    function cancelEditing() {
      vm.edited = null;
      vm.isEditing = false;
    }

    function cancelCreate() {
      initCreateForm();
      vm.isCreating = false;
    }

    function inc(object) {
      ItemsModel.inc(object.id, object)
        .then(function (result) {
          getAll();
        });
    }

    function dec(object) {
        ItemsModel.dec(object.id, object)
          .then(function (result) {
            getAll();
          });
    }

    function sync() {
      ItemsModel.sync(getAll);
    }

    vm.objects = [];
    vm.edited = null;
    vm.isEditing = false;
    vm.isCreating = false;
    vm.getAll = getAll;
    vm.create = create;
    vm.inc = inc;
    vm.dec = dec;
    vm.delete = deleteObject;
    vm.setEdited = setEdited;
    vm.isCurrent = isCurrent;
    vm.cancelEditing = cancelEditing;
    vm.cancelCreate = cancelCreate;
    vm.goToBackand = goToBackand;
    vm.isAuthorized = false;
    vm.sync = sync;

    $rootScope.$on('authorized', function () {
      vm.isAuthorized = true;
      getAll();
    });

    $rootScope.$on('logout', function () {
      clearData();
    });

    if (!vm.isAuthorized) {
      $rootScope.$broadcast('logout');
    }

    initCreateForm();
    getAll();

  })
;

