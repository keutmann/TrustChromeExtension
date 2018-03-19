//var settingsController = new SettingsController();
//var target;
//var settings; 

//https://www.reddit.com/user/trustchain/.json

var app = angular.module("myApp", []);
app.controller("trustlistCtrl", function($scope) {
    $scope.showContainer = false; // Less flickring
    $scope.history = [];

    $scope.init = function() {    
        $scope.subject = null;
        $scope.binarytrusts = [];
        $scope.trusted = [];
        $scope.distrusted = [];
        $scope.jsonVisible = false;
    }

    $scope.settingsController = new SettingsController();
    $scope.settingsController.loadSettings(function (settings) {
        $scope.settings = settings;
        $scope.settings.publicKeyHashBase64 = $scope.settings.publicKeyHash.toString('base64');
        $scope.packageBuilder = new PackageBuilder(settings);
        $scope.targetService = new TargetService(settings, $scope.packageBuilder);
        $scope.trustchainService = new TrustchainService(settings);
    });

    $scope.load = function(subject) {
        $scope.init();
        $scope.subject = subject;
        //$scope.subject parser.parse();
        $scope.trustHandler = new TrustHandler($scope.subject.queryResult, $scope.settings);
        $scope.subject.addressHex = (new tce.buffer.Buffer($scope.subject.address, 'base64')).toString("HEX");
        $scope.subject.identicoinData = $scope.getIdenticoinData($scope.subject.addressHex);
        $scope.subject.addressClass = (this.subject.type != "thing") ? "text-primary": "";
        $scope.subject.aliasClass = (this.subject.type == "thing") ? "text-primary": "";

        if(!$scope.subject.owner)
            $scope.subject.owner = {}

        // The subject has an owner
        if($scope.subject.owner.address) {
            $scope.subject.owner.addressHex = $scope.subject.owner.address.toString('HEX');
            $scope.subject.owner.identiconData16 = $scope.getIdenticoinData($scope.subject.owner.addressHex, 16);
        }

        $scope.subject.trusts = $scope.trustHandler.subjects[$scope.subject.address];
        $scope.subject.binaryTrust = $scope.trustHandler.CalculateBinaryTrust($scope.subject.address);

        for(var index in $scope.subject.trusts) {
            var trust = $scope.subject.trusts[index];

            // If trust is a BinaryTrust, decorate the trust object with data
            if(trust.type == $scope.packageBuilder.BINARYTRUST_TC1) {
                $scope.binarytrusts[trust.subjectAddress] = trust;
                trust.issuerAddressHex = (new tce.buffer.Buffer(trust.issuerAddress, 'base64')).toString("HEX");
                trust.identiconData = $scope.getIdenticoinData(trust.issuerAddressHex);

                // Add trust to the right list
                if(trust.attributesObj.trust)
                    $scope.trusted.push(trust);
                else
                    $scope.distrusted.push(trust);
                
                trust.showTrustButton = !($scope.subject.binaryTrust.direct && $scope.subject.binaryTrust.directValue);
                trust.showDistrustButton = !($scope.subject.binaryTrust.direct && !$scope.subject.binaryTrust.directValue);
                trust.showUntrustButton = $scope.subject.binaryTrust.direct;

                if($scope.subject.binaryTrust.direct) 
                    trust.alias = "(You)";
            }
        }

        for(var index in $scope.subject.trusts) {
            var trust = $scope.subject.trusts[index];
            // Ensure alias on trust, if exist
            if(trust.type == $scope.packageBuilder.IDENTITY_TC1) {

                $scope.binarytrusts[trust.subjectAddress].alias = trust.parseAttributes.alias + ($scope.subject.binaryTrust.direct) ? " (You)": "";
            }
        }
        
        $scope.json = JSON.stringify(subject, undefined, 2);
        $scope.showContainer = true;
        $scope.$apply();
    }

    $scope.analyseClick = function(trust) {
        $scope.history.push($scope.subject);
        trust.address = trust.issuerAddress;
        trust.queryResult = $scope.subject.queryResult;
        $scope.load(trust); // Trust becomes the subject
    }


    $scope.historyBack = function() {
        $scope.load($scope.history.pop()); // Trust becomes the subject
    }

    $scope.showHideJson = function() {
        $scope.jsonVisible = ($scope.jsonVisible) ? false: true;
    }


    $scope.getIdenticoinData = function(address, size) {
        if(!size) size = 64;
        return new Identicon(address, {margin:0.1, size:size, format: 'svg'}).toString();
    };
    
    $scope.trustClick = function(target) {

        return false;
    };

    $scope.distrustClick = function(target) {
        
        return false;
    }

    $scope.untrustClick= function(target) {
        
        return false;
    }


    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
          if (request.command == "showTarget") {
                $scope.load(request.data);
                sendResponse({result: "ok"});
          }
        });
    
});