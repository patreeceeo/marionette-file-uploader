describe("FileManager", function() {
    'use strict';

    var layout, files, global_progress, file, file2, file3;

    beforeEach(function () {
        Marionette.Renderer.render = function () {};
        files = new FileManager.Files([
            { name: 'test1', size: 100 }
            , { name: 'test2', size: 200 }
            , { name: 'test3', size: 300 }
        ]);
        layout = new FileManager.Layout({
            files: files
        });
        file = files.models[0];
        file2 = files.models[1];
        file3 = files.models[2];
    });

    it("should not allow the same file to be added more than once.", function () {
        files.add({name: "test1", size: 100 });
        expect(files.where({name: "test1"}).length).toBe(1);
    });

    describe("File", function () {

        it("should be uploaded when the upload method is successful.", function() {
            file.upload({
                success: function () {
                    expect(file.is_uploaded()).toBe(true);
                }
            });
        });

        it("should not be uploaded when immediately canceled.", function() {
            file.upload({
                ready: function () {
                    file.cancel();
                }
            });
            file2.upload({
                success: function () {
                    expect(file.is_uploaded()).toBe(false);
                }
            });

        });

        it("should be not uploaded when the upload method hasn't been called.", function() {
            expect(file.is_uploaded()).toBe(false);
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

        it("should be not uploaded when the upload method hasn't been called.", function() {
            expect(files.are_uploaded()).toBe(false);
        });
    });
});
