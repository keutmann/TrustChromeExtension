//var settingsController = new SettingsController();
//var target;
//var settings; 

//https://www.reddit.com/user/trustchain/.json

var app = angular.module("myApp", []);
app.controller("trustlistCtrl", function($scope) {

    $scope.subject = null;
    $scope.binarytrusts = [];
    $scope.trusted = [];
    $scope.distrusted = [];
    $scope.jsonVisible = false;

    $scope.settingsController = new SettingsController();
    $scope.settingsController.loadSettings(function (settings) {
        $scope.settings = settings;
        $scope.packageBuilder = new PackageBuilder(settings);
        $scope.targetService = new TargetService(settings, $scope.packageBuilder);
        $scope.trustchainService = new TrustchainService(settings);
    });

    $scope.load = function(subject) {
        $scope.subject = subject;

        $scope.subject.addressHex = (new tce.buffer.Buffer($scope.subject.address, 'base64')).toString("HEX");
        $scope.subject.identicoinData = $scope.getIdenticoinData($scope.subject.addressHex);
        $scope.subject.addressClass = (this.subject.type != "thing") ? "text-primary": "";
        $scope.subject.aliasClass = (this.subject.type == "thing") ? "text-primary": "";

        if(!$scope.subject.owner)
            $scope.subject.owner = {}

        if($scope.subject.owner.address) {
            $scope.subject.owner.addressHex = $scope.subject.owner.address.toString('HEX');
            $scope.subject.owner.identiconData16 = $scope.getIdenticoinData($scope.subject.owner.addressHex, 16);
        }

        for(var index in $scope.subject.trusts) {
            var trust = $scope.subject.trusts[index];
            trust.parseAttributes = JSON.parse(trust.attributes);

            if(trust.type == $scope.packageBuilder.BINARYTRUST_TC1) {
                $scope.binarytrusts[trust.subjectAddress] = trust;
                trust.identiconData = $scope.getIdenticoinData(trust.issuerAddress);
                trust.issuerAddressHex = (new tce.buffer.Buffer(trust.issuerAddress, 'base64')).toString("HEX");

                if(trust.parseAttributes.trust)
                    $scope.trusted.push(trust);
                else
                    $scope.distrusted.push(trust);
            }

            if(trust.type == $scope.packageBuilder.IDENTITY_TC1) {
                $scope.binarytrusts[trust.subjectAddress].alias = trust.parseAttributes.alias;
            }
        }

        $scope.$apply();
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
                document.getElementById("json").innerHTML = JSON.stringify(request.data, undefined, 2);
                $scope.load(request.data);
                sendResponse({result: "ok"});
          }
        });
    
});

// Onload


// Listen to the response from main
// window.addEventListener("message", function (event) {
//     if (event.data.type == "showTarget") {
//         DataBind(event.data.user);
//     }
//     if (event.data.type == "Issue") {
//         var radioTrustResult = $('input[name="radio-trust"]:checked').val();
//         if (radioTrustResult != "neutral")
//             target.trust = (radioTrustResult == "trust");

//         window.parent.postMessage({ type: "modalTrustIssue", target: target }, "*");
//     }
// });


//window.parent.postMessage({ type: "updateUsertrust", user: user }, "*");

//function DataBind(user) {
    // if (target.id) {
    //     var pubKey = tce.bitcoin.ECPair.fromPublicKeyBuffer(new tce.buffer.Buffer(target.id));
    //     $("#subjectId").html(pubKey.getAddress()); // Only render the Text part
    // } else {
    //     $("#subjectId").html("No Trust ID was provided.");
    // }
    // $("#contentName").html(target.content); // Only render the Text part

    // var buf = tce.buffer.Buffer.concat([new tce.buffer.Buffer("41", 'HEX'), new tce.buffer.Buffer(target.contentid)]);
    // var ctidbase85check = tce.base58check.encode(buf);
    // $("#contentid").html(ctidbase85check); // Only render the Text part
//}



