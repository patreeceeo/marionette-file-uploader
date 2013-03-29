
FileManager.addInitializer(function(){

    var files = new FileManager.Files([
        { 
            name: "file1"
            , data: image1_data
        }
        , {
            name: "file2"
            , data: "data:text/plain;charset=US-ASCII,This is a test. It keeps going and going and going and going and going."
        }
    ]);

    var layout = new FileManager.Layout({
        files: files
    });

    FileManager.main_region.show(layout);
});

