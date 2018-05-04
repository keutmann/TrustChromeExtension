var controller = new SettingsController();

// Onload
$(function () {
    controller.loadSettings(function (items) {
        BindSettings(items);
    });
});


$("#savebtn").click(function () {
    controller.loadSettings(function (items) {
        items["password"] = $("#inputPassword").val();
        items["seed"] = $("#inputSeed").val();
        items["rememberme"] = $("#rememberMe").prop('checked');
        items["infoserver"] = $("#trustserver").val();
        // items["buildserver"] = $("#buildserver").val();
        // items["graphserver"] = $("#graphserver").val();
        
        items["trustrender"] = $("input[name='trustrenderradio']:checked").val();
        items["trustrendercolor"] = "#EEFFDD";
        items["trustrendericon"] = "check16.png";

        items["resultrender"] = $("input[name='resultrenderradio']:checked").val();
        items["resultrendercolor"] = "lightpink";
        items["resultrendericon"] = "close16.png";
        items["resultrenderhide"] = $("#distrusthide").prop('checked');
        ;
        controller.saveSettings(items);
        controller.buildKey(items);
        BindSettings(items);
    });
});

function BindSettings(items) {
    $("#inputPassword").val(items.password);
    $("#inputSeed").val(items.seed);
    $("#trustserver").val(items.infoserver);
    $("#rememberMe").prop('checked', items["rememberme"] == true);

    // $("#buildserver").val(items.buildserver);
    // $("#graphserver").val(items.graphserver);
    $("[name='trustrenderradio']").val([items.trustrender]);
    $("[name='resultrenderradio']").val([items.resultrender]);

    $("#distrusthide").prop('checked', items["resultrenderhide"] == true);

    var address = items.publicKeyHash.toString('HEX');
    $("#address").text(address);
    // $("#privateKey").text(items.keyPair.toWIF());

    //var hash = tce.bitcoin.crypto.hash256("Demo");

    var data = new Identicon(address, {margin:0.1, size:64, format: 'svg'}).toString()
    $("#identicon").attr("src", "data:image/svg+xml;base64,"+data);
    
    //$("#hashValue").text(hash.toString('base64'));
    //var message = tce.bitcoin.message.magicHash(hash);
    //$("#message").text(message.toString('base64'));
    //var pre = new tce.buffer.Buffer('Demo', 'utf8');
    //$("#prehex").text(pre.toString('hex'));
    //var sig = tce.bitcoin.message.sign(items.keyPair, hash);
    //var sig = items.keyPair.sign(hash);
    //$("#signature").text(sig.toString('base64'));
}
