var settingsController = new SettingsController();
var target;
var settings; 

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
        var radioTrustResult = $('input[name="radio-trust"]:checked').val();
        if (radioTrustResult != "neutral")
            target.trust = (radioTrustResult == "trust");

        window.parent.postMessage({ type: "modalTrustIssue", target: target }, "*");
    }
});


// Fill in form
function OnDataLoad(data) {
    target = data.content;
    $("#subject").html(target.content); // Only render the Text part

    settingsController.loadSettings(function (data) {
        settings = data;
        settingsController.buildKey(settings);
    });
}


