///<reference path="../typings/globals/jquery/index.d.ts" />

var SubjectContainer = (function () {
    // Constructor
    function SubjectContainer() {
    }


    SubjectContainer.ensureSubject = function(author) {
        let subject = this.subjects[subject.author];
        if (!subject) {
            subject = {
                author: author,
                address:author.hash160(),
                scope: window.location.hostname,
                type: "person",
            };
            this.subjects.push(subject);
        }
        return subject;
    }

    // SubjectContainer.ensure = function(subject) {
    //     var instance = this.subjects[subject.author];
    //     if (!instance) {
    //         this.subjects.push(subject);
    //     }
    // }

    SubjectContainer.subjects = [];

    return SubjectContainer;
}());
