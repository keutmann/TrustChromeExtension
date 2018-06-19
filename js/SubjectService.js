///<reference path="../typings/globals/jquery/index.d.ts" />

var SubjectService = (function() {
    function SubjectService(settings, packageBuilder) {
        this.SCRIPT = "btc-pkh";
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

    SubjectService.ensureSubject = function(author) {
        let subject = this.subjects[author];
        if (!subject) {
            subject = {
                author: author,
                address:author.hash160(),
                scope: window.location.hostname,
                type: "person",
            };
            this.subjects[author]= subject;
        }
        return subject;
    }

    SubjectService.enrichSubject = function(author, comment) {

        let subject = this.ensureSubject(author);

        let $proof = $(comment).find("a[href*='scope=reddit']:contains('Proof')")
        if ($proof.length > 0) {
            var params = getQueryParams($proof.attr("href"));
            if(params.name == author) {
                if(!subject.owner)
                    subject.owner = params;
                
                subject.owner.author = author;

                if(typeof subject.owner.address === 'string') {
                    subject.owner.address = new tce.buffer.Buffer(subject.owner.address, 'HEX');
                }
            }
        }
        return subject;
    }


    SubjectService.prototype.BuildBinaryTrust = function(target, value, note, expire) {
        var trust = this.packageBuilder.CreateBinaryTrust(
            this.settings.publicKeyHash, 
            this.SCRIPT, 
            target.address.base64ToBuffer(), 
            value, 
            note,
            target.scope,
            0,
            expire);

        var package = this.packageBuilder.CreatePackage(trust);

        if(target.owner) {
            //var subjectAddress = new tce.buffer.Buffer(target.owner.address, 'HEX');
            let subjectAddress = target.owner.address.base64ToBuffer();
            var ownerTrust = this.packageBuilder.CreateBinaryTrust(
                this.settings.publicKeyHash, 
                this.SCRIPT, 
                subjectAddress, 
                value, 
                note,
                "", // Do not use scope on global identity
                0,
                expire);
            package.trusts.push(ownerTrust);

            if(target.type == "thing" && !isNullOrWhitespace(target.alias)) { 
                var aliastrust = this.packageBuilder.CreateIdentityTrust(
                    this.settings.publicKeyHash,
                    this.SCRIPT, 
                    subjectAddress,
                    { alias: target.alias },
                    target.scope,
                    0,
                    expire);

                package.trusts.push(aliastrust);
    
            }
        }
        return package;
    }

    SubjectService.subjects = [];

    return SubjectService;
}())


