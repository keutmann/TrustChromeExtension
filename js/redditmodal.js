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
    
    if (!target.id) {
        var rurl = "https://www.reddit.com/user/"+target.content+"/comments.json?t=all&limit=10&sort=new&t=all";
        $.ajax({
            type: "GET",
            url: rurl,
            dataType: 'json'
        }).done(function (result, textStatus, jqXHR) {
            if(result.data && result.data.children.length > 0) {
                for (var key in result.data.children) {
                    var child = result.data.children[key];
                    var body = child.data.body;
                    var proofIndex = body.indexOf("([Proof](");
                    if (proofIndex >= 0) {
                        var temp = body.substring(proofIndex);
                        var endsearch = '"' + target.content + '"))';
                        var endIndex = temp.indexOf(endsearch);
                        if (endIndex > 0) {
                            link = body.substring(proofIndex, endIndex);
                                
                            var query = link.split("?").pop().split("&amp;");
                            for (key in query) {
                                var part = query[key];
                                var p = part.split("=");
                                if (p[0] == 'id') {
                                    target.type = "id";
                                    target[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
                                }
                            }
                            break;
                        }
                    }
                }
            } 
            DataBind(target); // Default!
        }).fail(function (jqXHR, textStatus, errorThrown) {
            DataBind(target); // Default!
        });

    } else
        DataBind(target);

}

function DataBind(target) {
    var bufID = (target.id) ? new tce.buffer.Buffer(target.id, 'HEX') : null;
    if (bufID != null) {
        var address = tce.bitcoin.ECPair.fromPublicKeyBuffer(bufID).getAddress();
        $("#subjectId").html(address); // Only render the Text part
    } else {
        $("#subjectId").html("No ID was found");
    }

    $("#contentName").html(target.content); // Only render the Text part

    //var contentIdBuffer = (target.contentid) ? new tce.buffer.Buffer(target.contentid, 'HEX') : null;
    //var contentAddress = tce.bitcoin.ECPair.fromPublicKeyBuffer(contentid).getAddress();
    
    $("#contentid").html(target.contentid); // Only render the Text part
    //$("#subjectType").html(target.type); // Only render the Text part
}



