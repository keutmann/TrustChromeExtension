

function ParseTrustMe(a) {
    var user = null;
    if (a instanceof HTMLAnchorElement) {
        user = CreateTarget(a.text);

        if (a.search) {
            var pairs = a.search.substring(1).split('&');
            for (var i = 0; i < pairs.length; i++) {
                var kv = pairs[i].split('=');
                var val = decodeURIComponent(kv[1].replace(/\+/g, ' '));
                user[kv[0].toLowerCase()] = val;
            }
        }
    }
    else if (a instanceof String) {
        user = CreateTarget(a);
    }
    var $proof = $("a[href*='&scope=reddit']:contains('Proof')").first();
    if ($proof.length > 0) {
        var href = $proof.attr("href").split("&");
        for (key in href) {
            var part = href[key];
            var p = part.split("=");
            user[p[0]] = p[1];
        }
    }

    user.address = GetTargetAddress(user);

    return user;
}




// function BuildTrust(settings, target) {
//     var trustBuilder = new TrustBuilder(settings.publicKeyHash);

//     if (target.id) { // The target has an id !
//         //.publicKeyHash
//         var objId = new tce.buffer.Buffer(target.id, 'HEX');
//         var idaddress = tce.bitcoin.crypto.hash160(objId);
        
//         /*
//         var objSig = new tce.buffer.Buffer(target.sig, 'HEX');
//         var targetID = new tce.buffer.Buffer(target.target, 'HEX');
//         var ecSig = tce.bitcoin.ECSignature.fromDER(objSig);

//         if (!linkKeyPair.verify(targetID, ecSig)) {
//             console.log("Invalid signature on id : " + objId.toString('HEX'));
//             Alert("Invalid signature on id : " + objId.toString('HEX'));
//             return;
//         }
//         */
//         // Identity subject
//         var idSubject = trustBuilder.addSubject(idaddress, target.type, target.scope);
//         if (target.trust)
//             idSubject.claim["trust"] = target.trust;

//         // Name subject
//         trustBuilder.addSubjectByContent(target, "name");  // Add second subject trust with the name 
//     }
//     else 
//         trustBuilder.addSubjectByContent(target);  // Default content subject

//     trustBuilder.signIssuer(settings.keyPair);
//     return trustBuilder.trust;
// }

tce.buffer.Buffer.prototype.toJSON = function toJSON() {
    return this.toString('base64');
}

function GetTargetAddress(target) {
    var address = (target.id) ? GetAddress(target.id, target.sig, target.content) :
                GetIDFromContent(target.content);
    return address;
}



// Create a hash160 of a string
String.prototype.hash160 = function() {
    return tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(this, 'UTF8'));
}

function GetIDFromContent(content) {
    return tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(content, 'UTF8'));
}


function getQueryParams(url) {
    var qparams = {},
        parts = (url || '').split('?'),
        qparts, qpart,
        i = 0;

    if (parts.length <= 1) {
        return qparams;
    } else {
        qparts = parts[1].split('&');
        for (i in qparts) {

            qpart = qparts[i].split('=');
            qparams[decodeURIComponent(qpart[0])] =
                           decodeURIComponent(qpart[1] || '');
        }
    }

    return qparams;
};
