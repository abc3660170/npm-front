var axios = require("axios");
var express = require("express");
var router = express.Router();
var makeDB = require("../model/makeDB");
var multer = require("multer");
var { isBusy } = require("../utils/utils");
var { extractVersion } = require("../model/utils");
var { INUSED } = require("../utils/errorCode");
var upload = multer({ dest: "uploads/" });
var { getSuggestions, getPackageDocument } = require("../model/pelipper");
var fs = require('fs');
/* GET users listing. */
router.get("/suggestions", async function(req, res, next) {
  try {
    const keyword = req.query.q;
    res.json(await getSuggestions(keyword));
  } catch (error) {
    next(error);
  }
});

router.get("/package/:name/document", async function(req, res, next) {
  try {
    const packageName = req.params.name;
    res.json(await getPackageDocument(packageName));
  } catch (error) {
    next(error);
  }
});

router.post("/download", async function(req, res, next) {
  req.on("aborted", () => {
    // todo 撤销下载
  });
  if (isBusy()) {
    res.status(500).json({
      code: INUSED,
      message: "有人在用你先等等还行啊！",
    });
  } else {
    process.env.NPM_DOWNLOADING = true;
    const packages = req.body;
    try {
      const zipFile = await makeDB(packages);
      res.download(zipFile, () => {
        process.env.NPM_DOWNLOADING = false;
      });
    } catch (error) {
      res.status(500).json({
        code: error.name,
        message: error.message,
      });
      process.env.NPM_DOWNLOADING = false;
    }
  }
});

router.post("/resolvePkg", upload.single("file"), async function (req, res, next) {
    const file = req.file.path;
    let result = [];
    fs.readFile(file, 'utf-8', async (err, data) => {
      if(!err){
        try {
          const pkg = JSON.parse(data.toString());
          const dependencies = pkg.dependencies;
          const devDependencies = pkg.devDependencies;
          const mergeDeps = Object.assign({}, dependencies, devDependencies);
          const promises = [];
          for (const name in mergeDeps) {
            if (Object.hasOwnProperty.call(mergeDeps, name)) {
              promises.push(extractVersion(name, mergeDeps[name]));
            }
          }
          const versions = await Promise.all(promises);
          result = versions.map(val => `${val[0]}@${val[1]}`)
          res.json(result);
        } catch (err) {
          res.status(500).json(err);
        }
      } else {
        res.status(500).json(err);
      }
    })
});


module.exports = router;
