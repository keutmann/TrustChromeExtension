var settingsController = new SettingsController();
var targetData;

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
        Issue();
        window.parent.postMessage({ type: "close" }, "*");
    }
});


// Fill in form
function OnDataLoad(data) {
    targetData = data;
    $("#subject").html(data.content); // Only render the Text part

    settingsController.loadSettings(function (settings) {

        $('#password').text(settings.password);
        $('#seed').text(settings.seed);
    });
}


function Issue() {
    var radioTrustResult = $('input[name="radio-trust"]:checked').val();

    var trustObj = CreateTrust();

    if (targetData.id) { // The target has an id !

    }

    // Issue to content alone!

}