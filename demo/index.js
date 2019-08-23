(function () {
    'use strict';

    function updatePreview (iframe, example, videos) {
        iframe.setAttribute('srcdoc', getIFrameHTML({example, videos}));
    }

    function getIFrameHTML ({example, videos}) {
        return `<!DOCTYPE html>
<html>
    <head>
        <style>
            body, html {margin: 0; height: 100%; overflow: hidden;}
            canvas {width: 100%; height: 100%;}
            video {display: none;}
        </style>
        <script src="../index.js"></script>
        <script src="./utils.js"></script>
    </head>
    <body>
        ${videos}
        <canvas id="target"></canvas>
        <script>
            ${example}
        </script>
    </body>
</html>`;
    }

    window.updatePreview = updatePreview;

    const navOffHandler = () => document.body.classList.remove('nav-open');

    document.querySelector('#nav-on')
        .addEventListener('click', () => {
            document.body.classList.add('nav-open');

            setTimeout(() => document.body.addEventListener('click', navOffHandler, {once: true}), 0);
        });
}());
