function SettingsController()
{
    var self = this;
    this.createSettings = function() {
        var settings = {
            "password": '',
            "seed": '',
            "rememberme": true,
            "infoserver": "https://trust.dance",
            "buildserver": "https://trust.dance:12701",
            "graphserver": "https://trust.dance:12702",
            'trustrender': 'icon',
            "resultrender": 'warning'
            //"keypair": null
        }
        return settings;
    }

    this.saveSettings = function(settings) {
        if (settings.rememberme) {
            chrome.storage.local.set({ usersettings: settings }, function () {
                console.log('Settings saved');
            });
        }
    }

    this.loadSettings = function (cb) {
        chrome.storage.local.get('usersettings', function (result) {
            var settings = (result.usersettings) ? result.usersettings : self.createSettings();
            cb(settings);
        });
    }

    this.buildKey = function (settings) {
        var keystring = settings.password + settings.seed;
        var hash = tce.bitcoin.crypto.hash256(keystring);
        var d = tce.BigInteger.fromBuffer(hash)
        
        settings.keyPair = new tce.bitcoin.ECPair(d)
        settings.publicKeyHash = tce.bitcoin.crypto.hash160(settings.keyPair.getPublicKeyBuffer());

        return settings.keyPair;
    }

    return this;
}

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

function CreateTarget(content, type) {

    var obj = {
        page: undefined,
        id: undefined,
        sig: undefined,
        target: undefined,
        type: (type) ? type: "content",
        scope: window.location.hostname,
        trust: undefined,
        confirm: undefined,
        rating: 0,
        activate: 0,
        expire: 0,
        content: content ? content.trim() : content,
        elements : []
    };
    return obj;
}

function TrustBuilder(issuerId) {
    // A Trust visualized in json format.
    this.trust = {
        head : {
            "version": "standard 0.1.0", // Specifies the format of the Trust and encodings. Standard format : ver:Major, minor, patch;
            "script": "btc-pkh" // Specifies the id address format and signature algos. btc-pkh is the bitcoin address format.
        },
        // The entity that issues the trust to the subject.
        // The issuer property is required and is needed for signing the trust.
        issuer: {
            // ID of the issuer, format specified in head->script
            "id": issuerId,
            // Hash of a trust is combined by: head, issuer, subject
            // excluding the signature property.
            "signature": "",
            // The subject is the target of trust, issued by the issuer!
            "subject": [],
        }
    };

    this.addSubject = function(subjectId, idtype, scope) {
        var obj = {
            "id": subjectId, // id of the subject, format specified in head->script.
            //"signature": "", // Optional, provide if value of "cost" has to go under 100
            "idtype": (idtype) ? idtype : "", // Specifies the type of the id. Helps on filtering on Trust resolvement.
            // Scope is used to filter on trust resolvement. It can be any text
            "scope": (scope) ? scope : "", // The scope could also be specefic to country, area, products, articles or social medias etc.
            // Claim made about the subject. The format is specified by the version property in the header section.
            "claim": {
                //"trust": true, // Endicates if the subject is trusted or not.
                //"confirm": true // Endicates if the subject is confirmed to be real.
            },
            // This is a cost when resolving the trust. A more nodes are followed with low values.
            // The cost property can only have a value below 100 if the subject signature is provided. This helps e.g. search companies.
            // The cost value cannot be below 1.
            "cost": 100,
            "activate": 0, // When will the trust be active. unixepoch
            "expire": 0, // When will the trust deactivate. unixepoch
        }
        this.trust.issuer.subject.push(obj);
        return obj;
    }

    this.addSubjectByContent = function(target, type) {
        var id = tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(target.content, 'UTF8'));
        var subject = this.addSubject(id, (type) ? type : target.type, target.scope);
        if (target.trust != undefined)
            subject.claim["trust"] = target.trust;

        return subject;
    }


    this.signIssuer = function(keyPair) {
        var buf = new tce.buffer.Buffer(1024 * 256); // 256 Kb
        var offset = 0;
        offset = this.trust.issuer.id.copy(buf, offset, 0, this.trust.issuer.id.length);

        for (k in this.trust.issuer.subject) {
            var s = this.trust.issuer.subject[k];

            offset += s.id.copy(buf, offset, 0, s.id.length); // Bytes!
            offset += buf.write(s.idtype.toLowerCase(), offset);

            for (var c in s.claim) {
                if (!s.claim.hasOwnProperty(c))
                    continue;

                offset += buf.write(c.toLowerCase(), offset); // Default UTF8
                offset += buf.write(s.claim[c].toString().toLowerCase(), offset);
            }
            offset = buf.writeInt32LE(s.cost, offset);
            offset = buf.writeInt32LE(s.activate, offset);
            offset = buf.writeInt32LE(s.expire, offset);
            offset += buf.write(s.scope.toLowerCase(), offset);
        }

        var data = new tce.buffer.Buffer(offset);
        buf.copy(data, 0, 0, offset);
        this.trust.trustid = tce.bitcoin.crypto.hash256(data); 
        this.trust.issuer.signature = tce.bitcoin.message.sign(keyPair, this.trust.trustid);
    }

    return this;
}


function BuildTrust(settings, target) {
    var trustBuilder = new TrustBuilder(settings.publicKeyHash);

    if (target.id) { // The target has an id !
        var objId = new tce.buffer.Buffer(target.id, 'HEX');
        var linkKeyPair = tce.bitcoin.ECPair.fromPublicKeyBuffer(objId);

        var objSig = new tce.buffer.Buffer(target.sig, 'HEX');
        var targetID = new tce.buffer.Buffer(target.target, 'HEX');
        var ecSig = tce.bitcoin.ECSignature.fromDER(objSig);

        if (!linkKeyPair.verify(targetID, ecSig)) {
            console.log("Invalid signature on id : " + objId.toString('HEX'));
            Alert("Invalid signature on id : " + objId.toString('HEX'));
            return;
        }
        // Identity subject
        var idSubject = trustBuilder.addSubject(tce.bitcoin.crypto.hash160(objId), target.type, target.scope);
        if (target.trust)
            idSubject.claim["trust"] = target.trust;

        // Name subject
        trustBuilder.addSubjectByContent(target, "name");  // Add second subject trust with the name 
    }
    else 
        trustBuilder.addSubjectByContent(target);  // Default content subject

    trustBuilder.signIssuer(settings.keyPair);
    return trustBuilder.trust;
}

function BuildPackage(setttings, target) {
    var trust = BuildTrust(setttings, target);
    var obj = {
        trust: [trust]
    };
    return obj;
}

tce.buffer.Buffer.prototype.toJSON = function toJSON() {
    return this.toString('base64');
}

function GetTargetAddress(target) {
    var address = (target.id) ? GetAddress(target.id, target.sig, target.content) :
                GetIDFromContent(target.content);
    return address;
}

function GetAddress(id, sig, target) {
    var objId = new tce.buffer.Buffer(id, 'HEX');
    var linkKeyPair = tce.bitcoin.ECPair.fromPublicKeyBuffer(objId);

    var objSig = new tce.buffer.Buffer(sig, 'HEX');
    var targetID = new tce.buffer.Buffer(target, 'HEX');
    var ecSig = tce.bitcoin.ECSignature.fromDER(objSig);

    if (!linkKeyPair.verify(targetID, ecSig)) {
        console.log("Invalid signature on id : " + objId.toString('HEX'));
        Alert("Invalid signature on id : " + objId.toString('HEX'));
        return;
    }

    return tce.bitcoin.crypto.hash160(objId);
}

function GetIDFromContent(content) {
    return tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(content, 'UTF8'));
}


function ResolveTarget(target, settings) {
    var deferred = $.Deferred();
    var resolve = undefined;

    //var key = (target.id) ? target.id : target.content + target.scope;
    // cache
    //var cacheValue = localStorage[key];
    //if (cacheValue) {
        //resolve = JSON.parse(cacheValue);
        //deferred.resolve(resolve);
    //}

    // Ajax
    //if (!cacheValue) {

    settingsController.buildKey(settings);

    var query = BuildQuery(target, settings);
    var data = JSON.stringify(query);

    var rurl = settings.graphserver + '/api/query/';
    $.ajax({
        type: "POST",
        url: rurl,
        data: data,
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    }).done(function (msg, textStatus, jqXHR) {
        resolve = msg;
        deferred.resolve(resolve);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        TrustServerErrorAlert(jqXHR, textStatus, errorThrown, settings.graphserver);
        deferred.fail();
    });

    return deferred.promise();
}

function BuildQuery(target, settings) {

    //var subjectAddress = GetTargetAddress(target);



    var subjects = target.map(function (item) { return { id: item.id, type: '' } });
   

    var obj = {
        "issuers": [settings.publicKeyHash],
        "subjects": subjects,

        // Scope is used to filter on trust resolvement. It can be any text
        "scope": (target.scope) ? target.scope : "", // The scope could also be specefic to country, area, products, articles or social medias etc.

        // Claim made about the subject. The format is specified by the version property in the header section.
        "claim": {
            "trust": true, // Search for trusted subjects.
            //"confirm": true // Search for subjects that has been confirmed to be real, like a person or corp.
        },

    }
    return obj;

}

function TrustServerErrorAlert(jqXHR, textStatus, errorThrown, server) {
    if (jqXHR.status == 404 || errorThrown == 'Not Found') {
        var msg = 'Error 404: Server ' + server + ' was not found.';
        //alert('Error 404: Server ' + server + ' was not found.');
        console.log(msg);
    }
    else {
        var msg = textStatus + " : " + errorThrown;
        if (jqXHR.responseJSON && jqXHR.responseJSON.ExceptionMessage)
            msg = jqXHR.responseJSON.ExceptionMessage;

        alert(msg);
    }
        
}


function QueryParser(queryResult) {
    var self = this;

    this.FindById = function(id) {
        return FindNodeById(id, queryResult);
    }

    function FindNodeById(id, parentNode) {
        for (key in parentNode.nodes) {
            var node = parentNode.nodes[key];
            if (node.id == id)
                return node;

            if (node.nodes) {
                var result = FindNodeById(id, node);
                if (result)
                    return result;
            }
        }
        return null;
    }

    return this;
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

//{
//    "TotalNodeCount": 1,
//	"TotalEdgeCount": 1,
//	"MatchEdgeCount": 1,
//	"nodes": [{
//	    "id": "K2c618oiqO547JJ9bWs6lsKFWCI=",
//	    "idtype": "content",
//	    "claim": {
//	        "trust": true
//	    },
//	    "cost": 100,
//	    "activate": 0,
//	    "expire": 0,
//	    "scope": "www.reddit.com"
//	}]
//}