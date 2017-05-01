var settingsController = new SettingsController();
var targetData;
var settings; 
var scope = "reddit";

// Onload
$(function () {
    window.parent.postMessage({ type: "getDialogData" }, "*");
    $("input[type='radio']").checkboxradio({
        icon: false
    });
});


// Listen to the response from main
window.addEventListener("message", function (event) {
    if (event.data.type == "getDialogDataResult") {
        OnDataLoad(event.data);
    }
    if (event.data.type == "Issue") {
        var trust = Issue();
        window.parent.postMessage({ type: "close", content: trust }, "*");
    }
});


// Fill in form
function OnDataLoad(data) {
    targetData = data.content;
    $("#subject").html(targetData.content); // Only render the Text part

    settingsController.loadSettings(function (data) {
        settings = data;
        settingsController.buildKey(settings);
        //$('#password').text(settings.password);
        //$('#seed').text(settings.seed);
    });
}


function Issue() {
    var trust = new Trust();
    var issuer = trust.addIssuer(settings.publicKeyHash);

    var radioTrustResult = $('input[name="radio-trust"]:checked').val();

    if (targetData.id) { // The target has an id !
        var id = new tce.buffer.Buffer(targetData.id, 'HEX');
        var linkKeyPair = tce.bitcoin.ECPair.fromPublicKeyBuffer(id);

        var sig = new tce.buffer.Buffer(targetData.sig, 'HEX');
        var target = new tce.buffer.Buffer(targetData.target, 'HEX');
        var sigObj = tce.bitcoin.ECSignature.fromDER(sig);

        if (!linkKeyPair.verify(target, sigObj))
        {
            console.log("Invalid signature on id : " + id.toString('HEX'));
            Alert("Invalid signature on id : " + id.toString('HEX'));
            return;
        }
        // Identity subject
        var idSubject = issuer.addSubject(tce.bitcoin.crypto.hash160(id), targetData.type, scope);

        if (radioTrustResult != "neutral")
            idSubject.claim["trust"] = (radioTrustResult == "trust");

        // name subject
        //var nameHash = tce.bitcoin.crypto.hash160(targetData.content);
        var nameSubject = issuer.addSubject(target, "name", scope);
        if (radioTrustResult != "neutral")
            nameSubject.claim["trust"] = (radioTrustResult == "trust");

    }
    else
    {
        var nameHash = tce.bitcoin.crypto.hash160(targetData.content);
        var nameSubject = issuer.addSubject(nameHash, "name", scope);
        if (radioTrustResult != "neutral")
            nameSubject.claim["trust"] = (radioTrustResult == "trust");
    }

    issuer.sign(settings.keyPair);
    return JSON.stringify(trust, null, "\t");
}