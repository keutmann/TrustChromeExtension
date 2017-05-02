function SettingsController()
{
    var self = this;
    this.createSettings = function() {
        var settings = {
            "password": '',
            "seed": '',
            "rememberme": true,
            "infoserver": "http://trust.dance",
            "buildserver": "http://trust.dance:12701",
            "graphserver": "http://trust.dance:12702"
            //"keypair": null
        }
        return settings;
    }

    this.saveSettings = function(settings) {
        if (settings.rememberme) {
            chrome.storage.local.set(settings, function () {
                console.log('Settings saved');
            });
        }
    }

    this.loadSettings = function (cb) {
        var settings = self.createSettings();
        chrome.storage.local.get(settings, function (items) {
            cb(items);
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
    if (a instanceof HTMLAnchorElement) {
        var target = CreateTarget(a.text);
        if (a.search) {
            var pairs = a.search.substring(1).split('&');
            for (var i = 0; i < pairs.length; i++) {
                var kv = pairs[i].split('=');
                var val = decodeURIComponent(kv[1].replace(/\+/g, ' '));
                target[kv[0].toLowerCase()] = val;
            }
        }

        return target;
    }
    else if(a instanceof String)
        return CreateTarget(a);
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
        content: content ? content.trim() : content
    };
    return obj;
}

function TrustBuilder() {
    // A Trust visualized in json format.
    this.trust = {
        head : {
            "version": "standard 0.1.0", // Specifies the format of the Trust and encodings. Standard format : ver:Major, minor, patch;
            "script": "btc-pkh" // Specifies the id address format and signature algos. btc-pkh is the bitcoin address format.
        }
    };

    this.trust.issuer = [];
    
    this.addIssuer = function (issuerId) { // issuerId = Buffer!
        // The entity that issues the trust to the subject.
        // The issuer property is required and is needed for signing the trust.
        var obj = {
            // ID of the issuer, format specified in head->script
            "id": issuerId,
            // Hash of a trust is combined by: head, issuer, subject
            // excluding the signature property.
            "signature": "",
            // The subject is the target of trust, issued by the issuer!
            "subject": [],
            
        }
        this.trust.issuer.push(obj);
        return obj;
    }

    this.addSubject = function(issuer, subjectId, idtype, scope) {
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
        issuer.subject.push(obj);
        return obj;
    }

    this.addSubjectByContent = function(issuer, target, type) {
        var id = tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(target.content, 'UTF8'));
        var subject = this.addSubject(issuer, id, (type) ? type : target.type, target.scope);
        if (target.trust)
            subject.claim["trust"] = target.trust;

        return subject;
    }


    this.signIssuer = function(issuer, keyPair) {
        var buf = new tce.buffer.Buffer(1024 * 256); // 256 Kb
        var offset = 0;
        offset = issuer.id.copy(buf, offset, 0, issuer.id.length); 

        for (k in issuer.subject) {
            var s = issuer.subject[k];

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
        var hash = tce.bitcoin.crypto.hash256(data); // hash = trust id

        issuer.signature = keyPair.sign(hash).toDER();
    }

    return this;
}


function BuildTrust(settings, target) {
    var trustBuilder = new TrustBuilder();
    var issuer = trustBuilder.addIssuer(settings.publicKeyHash);

    if (target.id) { // The target has an id !
        var id = new tce.buffer.Buffer(target.id, 'HEX');
        var linkKeyPair = tce.bitcoin.ECPair.fromPublicKeyBuffer(id);

        var sig = new tce.buffer.Buffer(target.sig, 'HEX');
        var targetID = new tce.buffer.Buffer(target.target, 'HEX');
        var sigObj = tce.bitcoin.ECSignature.fromDER(sig);

        if (!linkKeyPair.verify(targetID, sigObj)) {
            console.log("Invalid signature on id : " + id.toString('HEX'));
            Alert("Invalid signature on id : " + id.toString('HEX'));
            return;
        }
        // Identity subject
        var idSubject = trustBuilder.addSubject(issuer, tce.bitcoin.crypto.hash160(id), target.type, target.scope);
        if (target.trust)
            idSubject.claim["trust"] = target.trust;

        // Name subject
        trustBuilder.addSubjectByContent(issuer, target, "name");  // Name subject
    }
    else 
        trustBuilder.addSubjectByContent(issuer, target);  // Default content subject

    trustBuilder.signIssuer(issuer, settings.keyPair);
    return trustBuilder.trust;
}

tce.buffer.Buffer.prototype.toJSON = function toJSON() {
    return this.toString('base64');
}

