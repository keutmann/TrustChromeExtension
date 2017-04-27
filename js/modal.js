var settingsController = new SettingsController();

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
        window.parent.postMessage({ type: "close" }, "*");
        //alert("Issue");
        //$("#trustContent").html("Issuing a Trust");
        //setTimeout(function () {
        //    //alert($("#password").text());
        //    window.parent.postMessage({ type: "close" }, "*");
        //}, 1000);
    }
});

// Fill in form
function OnDataLoad(data) {
    $("#subject").html(data.content); // Only render the Text part

    settingsController.loadSettings(function (settings) {

        $('#password').text(settings.password);
        $('#seed').text(settings.seed);
    });
}
