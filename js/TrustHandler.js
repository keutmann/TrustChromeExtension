///<reference path="../typings/globals/jquery/index.d.ts" />

var TrustHandler = (function() {
    function TrustHandler(package, settings) {
        if(!package) 
            package = { trusts: [] };

        this.settings = settings;
        this.package = package;
        this.subjects = [];
        this.BuildSubjects();

    }

    TrustHandler.prototype.BuildSubjects = function() {
        if(!this.package.trusts)
            return;

        for(var trustIndex in this.package.trusts)
        {
            var trust = this.package.trusts[trustIndex];
            trust.attributesObj = JSON.parse(trust.claim);

            var list = this.subjects[trust.subject.address];
            if(!list) {
                list = []
                this.subjects[trust.subject.address] = list;
            } 

            list[trust.issuer.address] = trust;
        }
    }


    TrustHandler.prototype.CalculateBinaryTrust = function(addressBase64) {
        var result = {
            direct : false,
            directValue: false,
            isTrusted: 0
        };
        
        var subjectTrusts = this.subjects[addressBase64];
        if(!subjectTrusts)
            return result;

        var binaryTrustCount = 0;
        for(var i in subjectTrusts) {
            var trust = subjectTrusts[i];
            
            if(trust.type === "binarytrust.tc1") {
                binaryTrustCount ++;

                if(trust.attributesObj.trust === true) 
                    result.isTrusted++;
                 else
                    result.isTrusted--;
                                // IssuerAddress is base64
                if(trust.issuer.address == this.settings.publicKeyHashBase64)
                {
                    result.direct = true;
                    result.directValue = trust.attributesObj.trust;
                }
            }

        }
        result.trustPercent = Math.floor((result.isTrusted * 100) / binaryTrustCount);

        return result;
    }

    return TrustHandler;
}());