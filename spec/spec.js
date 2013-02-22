describe("FileManager", function() {
    "use strict";

    var layout, files, global_progress;

    beforeEach(function () {
        Marionette.Renderer.render = function () {};
        files = new FileManager.Files([
            { name: "test1", size: 100 }
            , { name: "test2", size: 200 }
            , { name: "test3", size: 300 }
        ]);
        global_progress = new FileManager.Progress();
        layout = new FileManager.Layout({
            files: files
            , global_progress: global_progress
        });
    });

    it("should not allow the same file to be added more than once.", function () {
        files.add({name: "test1", size: 100 });
        expect(files.where({name: "test1"}).length).toBe(1);
    });

    describe("File", function () {

        it("should be uploaded when the upload method is successful.", function() {
            var file = files.models[0];
            file.upload({
                success: function () {
                    expect(file.is_uploaded()).toBe(true);
                }
            });
        });
    });

    describe("Files", function () {
        it("should be uploaded when the upload method is successful.", function() {
            files.upload({
                success: function () {
                    expect(files.are_uploaded()).toBe(true);
                }
            });
        });
    });
});
