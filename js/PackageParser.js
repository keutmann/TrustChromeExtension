var PackageParser = (function() {
    function  PackageParser(package) {
        var self = this;

        this.package = package;
        this.targets = [];

        for(var trustIndex in package.trusts)
        {
            var trust = package.trusts[trustIndex];
            var target = this.targets[trust.subjectAddress];
            if(!target) {
                target = {
                    subjectAddress : trust.subjectAddress,
                }
                target.trusts = [];
                this.targets[trust.subjectAddress] = target;
            } 

            target.trusts.push(trust);
        }
    }

    PackageParser.prototype.claimAnalysis = function(target) {
        var result = {
            "trusttrue" : 0,
            "trustfalse" : 0,
            "trust" : 0,    
            "type" : []
        };
        
        for(var i in target.trusts) {
            var trust = target.trusts[i];
            
            if(trust.type === "binarytrust.tc1") {
                var obj = JSON.parse(trust.attributes);
                if(obj.trust === true) 
                    result.trusttrue++;
                 else
                    result.trustfalse++;
            }
        }
        var total = result.trusttrue + result.trustfalse;
        result.trust = Math.floor((result.trusttrue * 100) / total);

        return result;
    }

    return PackageParser;
}());