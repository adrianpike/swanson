// TODO
// watermarking

var CONFIG = require('config');

var winston = require('winston');
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: CONFIG.logfile })
  ]
});

var crypto = require('crypto');
var http = require('http');
var url = require('url');
var gm = require('gm');
var fs = require('fs');
var qs = require('querystring');

proxy_url = function(url, resp, opts) {
  opts = opts || {};
  opts.redirects_left = opts.redirects_left || CONFIG.max_redirects;
  opts.image_width = opts.image_width || CONFIG.default_width;
  opts.image_height = opts.image_height || CONFIG.default_height;
  opts.geometry_string = opts.geometry_string || CONFIG.geometry_string;
  opts.force_format = opts.force_format || null;
  opts.watermark = opts.watermark || null;

  logger.info('Fetching:',url);
  var client_req = http.request(url, function(res) {
    logger.debug('STATUS: ' + res.statusCode);
    logger.debug('HEADERS: ' + JSON.stringify(res.headers));

    switch (res.statusCode) {
      case 301:
        opts.redirects_left -= 1;
        if (opts.redirects_left > 0) {
          return proxy_url(res.headers['location'], resp, opts);
        } else {
          return die('Too many redirects', resp);
        }
        break;
      case 200:
        if (CONFIG.max_size && res.headers['content-length'] > CONFIG.max_size) {
          die('Too big an image', resp);
        }

        var content_type = res.headers['content-type'];
        resp.writeHead(200, {
          "Content-Type": content_type,
          "Cache-Control": 'public,max-age=' + CONFIG.max_age
        });
        var extension = content_type.split('/')[1];

        var manipulated = gm(res, 'test.' + extension).gravity('Center').geometry(opts.image_width,opts.image_height,opts.geometry_string).crop(opts.image_width,opts.image_height);

        if (opts.watermark) {
          // TODO :)
        }

        manipulated.stream('test.' + extension, function (err, stdout, stderr) {
          stderr.on('data', function(data) {
            logger.error('Graphicsmagick error', data);
          });
          stdout.pipe(resp);
        });
      break;
      default:
        return die('Unable to fetch image', resp);
    }
  });
  client_req.on('error', function(e) {
    logger.error('Couldnt connect', url, e);
  });
  client_req.end();
};

die = function(reason, resp) {
  resp.writeHead(200);
  resp.write(reason);
  resp.end();
};

server = http.createServer(function(req, resp) {
  logger.info(req.method, req.url);
  if (req.method != 'GET') {
    die('Only GETs are, uh, gotten.', resp);
  } else {
    var request_url = url.parse(req.url);
    var params = qs.parse(request_url.query);
    var remote_url = params.url;

    if (params.url) {

      if (CONFIG.secret) { // We've got a signature to work with - we'll check hashes. Otherwise we're cool to just keep truckin'.
        var hmac = crypto.createHmac('sha256', CONFIG.secret);
        hmac.update(request_url.query);
        var desired = hmac.digest('hex');
        if (desired != request_url.pathname.replace(/\//,'')) {
          logger.info('Hash mismatch.');
          logger.debug('Wanted: ' + desired + ' Got: ' + request_url.pathname.replace(/\//,''));
          return die('Hashes dont match.', resp);
        }
      }

      proxy_url(remote_url, resp, {
        image_width: params.width,
        image_height: params.height,
        watermark: params.watermark
      });
    } else {
      die('Can haz URL param?', resp);
    }
  }
});

logger.info('Swanson up and running on port', CONFIG.port);
server.listen(CONFIG.port);
