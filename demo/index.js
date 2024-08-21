(function () {
    'use strict';

    function updatePreview(iframe, example, videos) {
        iframe.setAttribute('srcdoc', getIFrameHTML({ example, videos }));
    }

    function getIFrameHTML({ example, videos }) {
        return `<!DOCTYPE html>
<html>
    <head>
        <style>
            body, html {margin: 0; height: 100%; overflow: hidden; background: black; display: grid;}
            canvas {width: auto; height: 100%; place-self: center;}
            video, img {display: none;}
            .clickable {cursor: pointer;}
        </style>
        <script type="module" src="../index.js"></script>
        <script src="./utils.js"></script>
    </head>
    <body>
        ${videos}
        <canvas id="target"></canvas>
        <script type="module">
            ${example}
        </script>
    </body>
</html>`;
    }

    window.updatePreview = updatePreview;

    function insertSection(id) {
        const section = document.querySelector(`#${id}`);
        const main = document.querySelector('main');

        main.querySelector('#section-wrapper').innerHTML = section.innerHTML;

        sectionScripts[id]();
    }

    document.querySelector('nav').addEventListener('click', (e) => {
        const id = e.target.dataset.sectionId;
        insertSection(id);
    });

    document.querySelector('#open-code').addEventListener('click', () => {
        document.querySelector('#section-wrapper').classList.toggle('open');
    });

    function startDemo(script, ids) {
        const code = document.querySelector(`#${ids.code}`);
        const preview = document.querySelector(`#${ids.preview}`);
        const video = document.querySelector(`#${ids.video}`);
        const refresh = document.querySelector(`#${ids.refresh}`);

        fetch(script)
            .then((resp) => resp.text())
            .then((text) => {
                code.value = text;
                const doc = CodeMirror.fromTextArea(code, {
                    value: text,
                    lineNumbers: true,
                    theme: 'dracula',
                });

                const update = () =>
                    updatePreview(
                        preview,
                        doc.getValue(),
                        video ? video.innerHTML : '',
                    );

                refresh.addEventListener('click', update);

                update();
            });
    }

    const sectionScripts = {
        section1() {
            startDemo('./turbulence.js', {
                code: 'code1',
                preview: 'preview',
                video: 'videos1',
                refresh: 'refresh1',
            });
        },

        section2() {
            startDemo('./hue-fade.js', {
                code: 'code2',
                preview: 'preview',
                video: 'videos2',
                refresh: 'refresh2',
            });
        },

        section3() {
            startDemo('./disp.js', {
                code: 'code3',
                preview: 'preview',
                video: 'videos3',
                refresh: 'refresh3',
            });
        },

        section4() {
            startDemo('./duotone.js', {
                code: 'code4',
                preview: 'preview',
                video: 'videos4',
                refresh: 'refresh4',
            });
        },

        section5() {
            startDemo('./cellular-noise.js', {
                code: 'code5',
                preview: 'preview',
                refresh: 'refresh5',
            });
        },

        section6() {
            startDemo('./dissolve-transition.js', {
                code: 'code6',
                preview: 'preview',
                video: 'videos2',
                refresh: 'refresh6',
            });
        },

        section7() {
            startDemo('./dissolve-gallery.js', {
                code: 'code7',
                preview: 'preview',
                video: 'none',
                refresh: 'refresh7',
            });
        },

        section8() {
            startDemo('./kaleidoscope.js', {
                code: 'code8',
                preview: 'preview',
                video: 'videos5',
                refresh: 'refresh8',
            });
        },

        section9() {
            startDemo('./alpha-mask.js', {
                code: 'code9',
                preview: 'preview',
                video: 'videos2',
                refresh: 'refresh9',
            });
        },
    };

    insertSection('section7');

})();
