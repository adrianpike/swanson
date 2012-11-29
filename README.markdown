Swanson
=======

> "I worry what you just heard was: Give me a lot of images. What I said was: Give me _all_ the images you have."


Swanson is a secure image manipulation proxy written in node.js. It allows you to resize and crop, as well as proxy non-SSL images so you can serve them on an HTTPS page without mixed content warnings. It also uses graphicsmagick's stream capability to ease the pain with huge images.

It's heavily influenced by Camo - we specifically needed image manipulation though on top of the proxy capability, and thus Swanson was born.

Quickstart
----------

    > npm install
    > node server.js

  `<img src="https://your_swanson_host_here:8080/?url=http://internets.com/shiny_image.png&width=500&height=200">`
  `<img src="https://your_swanson_host_here:8080/?url=http://internets.com/shiny_image.png&width=128&height=128&watermark=yeeeeeaaaaaa">`

Signing Requests
----------------

If you add a secret in the config, Swanson will expect the request path to be the HMAC'ed SHA256 of the entire param string, in order. Like so:

  `<img src="http://localhost:8080/8ca524d43a431ba856cb629b8e8918f709478f422134ad224b30b69a8c730333?url=http://google.com/test.png&width=500&height=500">`

Do note that's a legitimate URL if the secret is `CHANGEMEPLEASE`

Performance Notes
----------------

- We aggressively set expires caches far in the future. Use a cachebreaker param.
- It's a good idea to put Swanson behind a caching proxy. We're seeing good success with Varnish.

Benchmarks
----------

TODO: actual science here would be nice.

It's surprisingly friendly, actually. Obviously there's a nasty latency hit while it has to start fetching the remote image, but all in all it'll destroy your bandwidth quite effectively. I need to do some more testing around the graphicsmagick load, but I'm happy thus far.

The setup: All of these were run on a 2.4GHz Core 2 Duo Mac Mini. Signed requests were used, and the proxied image was served from the local Apache install. I wanted to take the network bandwidth out of the equation for these, as I expect that to be the primary bottleneck in most all production instances. The network load was generated via siege on a seperate machine over a LAN.

The image was a 100px by 100px placeholder placeholder image, and was 336 bytes.

Here's the siege command I used:

    siege -u "http://10.1.10.13:8080/23dbb5033f77400e64161d2f03b8cfef45369351c931c8dd0753f5084dbbbf56?url=http://10.1.10.13/~adrian/100x100.gif&width=50&height=50" -d1 -c25 -r10`

<table>
  <tr><td>Connections</td><td>50</td><td>100</td><td>200</td></tr>
  <tr><td>Transactions/sec</td><td>44.60</td><td>46.90</td><td>46.06</td></tr>
  <tr><td>Availability</td><td>100%</td><td>100%</td><td>100%</td></tr>
  <tr><td>Longest transaction</td><td>0.74</td><td>2.18</td><td>5.21</td></tr>
</table>
