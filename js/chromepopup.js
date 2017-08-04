var controller = new SettingsController();

// Onload
$(function () {
    controller.loadSettings(function (items) {
        controller.buildKey(items);
        BindSettings(items);
    });
});


$("#savebtn").click(function () {
    controller.loadSettings(function (items) {
        items["password"] = $("#inputPassword").val();
        items["seed"] = $("#inputSeed").val();
        items["rememberme"] = $("#rememberMe").is(':checked');
        items["infoserver"] = $("#infoserver").val();
        items["buildserver"] = $("#buildserver").val();
        items["graphserver"] = $("#graphserver").val();
        
        items["trustrender"] = $("input[name='trustrenderradio']:checked").val();
        items["resultrender"] = $("input[name='resultrenderradio']:checked").val();

        controller.saveSettings(items);
        controller.buildKey(items);
        BindSettings(items);
    });
});

function BindSettings(items) {
    $("#inputPassword").val(items.password);
    $("#inputSeed").val(items.seed);
    $("#infoserver").val(items.infoserver);
    $("#buildserver").val(items.buildserver);
    $("#graphserver").val(items.graphserver);
    $("[name='trustrenderradio']").val([items.trustrender]);
    $("[name='resultrenderradio']").val([items.resultrender]);

    $("#address").text(items.keyPair.getAddress());
    $("#privateKey").text(items.keyPair.toWIF());

    var hash = tce.bitcoin.crypto.hash256("Demo");
    //$("#hashValue").text(hash.toString('base64'));
    //var message = tce.bitcoin.message.magicHash(hash);
    //$("#message").text(message.toString('base64'));
    //var pre = new tce.buffer.Buffer('Demo', 'utf8');
    //$("#prehex").text(pre.toString('hex'));
    var sig = tce.bitcoin.message.sign(items.keyPair, hash);
    //var sig = items.keyPair.sign(hash);
    $("#signature").text(sig.toString('base64'));
}
