function updatePreview (iframe, example, videos) {
    iframe.setAttribute('srcdoc', getIFrameHTML({example, videos}))
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

function insertSection (id) {
    const section = document.querySelector(`#${id}`);
    const main = document.querySelector('main');

    main.innerHTML = section.innerHTML;

    sectionScripts[id]();
}

document.querySelector('nav')
    .addEventListener('click', e => {
        const id = e.target.dataset.sectionId;
        insertSection(id);
    });

const sectionScripts = {
    section1 () {
        const text1 = document.querySelector('#code1');
        const preview1 = document.querySelector('#preview1');
        const videos1 = document.querySelector('#videos1');
        const refresh1 = document.querySelector('#refresh1');

        fetch('./turbulence.js')
            .then(resp => resp.text())
            .then(text => {
                text1.value = text;
                const doc = CodeMirror.fromTextArea(text1, {
                    value: text,
                    lineNumbers: true,
                    theme: 'dracula'
                });

                const update = () => updatePreview(preview1, doc.getValue(), videos1.innerHTML);

                refresh1.addEventListener('click', update);

                update();
            });
    },

    section2 () {
        const text2 = document.querySelector('#code2');
        const preview2 = document.querySelector('#preview2');
        const videos2 = document.querySelector('#videos2');
        const refresh2 = document.querySelector('#refresh2');

        fetch('./hue-fade.js')
            .then(resp => resp.text())
            .then(text => {
                text2.value = text;
                const doc = CodeMirror.fromTextArea(text2, {
                    value: text,
                    lineNumbers: true,
                    theme: 'dracula'
                });

                const update = () => updatePreview(preview2, doc.getValue(), videos2.innerHTML);

                refresh2.addEventListener('click', update);

                update();
            });
    },

    section3 () {
        const text3 = document.querySelector('#code3');
        const preview3 = document.querySelector('#preview3');
        const videos3 = document.querySelector('#videos3');
        const refresh3 = document.querySelector('#refresh3');

        fetch('./disp.js')
            .then(resp => resp.text())
            .then(text => {
                text3.value = text;
                const doc = CodeMirror.fromTextArea(text3, {
                    value: text,
                    lineNumbers: true,
                    theme: 'dracula'
                });

                const update = () => updatePreview(preview3, doc.getValue(), videos3.innerHTML);

                refresh3.addEventListener('click', update);

                update();
            });
    },

    section4 () {
        const text4 = document.querySelector('#code4');
        const preview4 = document.querySelector('#preview4');
        const videos4 = document.querySelector('#videos4');
        const refresh4 = document.querySelector('#refresh4');

        fetch('./duotone.js')
            .then(resp => resp.text())
            .then(text => {
                text4.value = text;
                const doc = CodeMirror.fromTextArea(text4, {
                    value: text,
                    lineNumbers: true,
                    theme: 'dracula'
                });

                const update = () => updatePreview(preview4, doc.getValue(), videos4.innerHTML);

                refresh4.addEventListener('click', update);

                update();
            });
    },

    section5 () {
        const text5 = document.querySelector('#code5');
        const preview5 = document.querySelector('#preview5');
        const refresh5 = document.querySelector('#refresh5');

        fetch('./cellular-noise.js')
            .then(resp => resp.text())
            .then(text => {
                text5.value = text;
                const doc = CodeMirror.fromTextArea(text5, {
                    value: text,
                    lineNumbers: true,
                    theme: 'dracula'
                });

                const update = () => updatePreview(preview5, doc.getValue(), '');

                refresh5.addEventListener('click', update);

                update();
            });
    },

    section6() {
        const text6 = document.querySelector('#code6');
        const preview6 = document.querySelector('#preview6');
        const videos2 = document.querySelector('#videos2');
        const refresh6 = document.querySelector('#refresh6');

        fetch('./dissolve-transition.js')
            .then(resp => resp.text())
            .then(text => {
                text6.value = text;
                const doc = CodeMirror.fromTextArea(text6, {
                    value: text,
                    lineNumbers: true,
                    theme: 'dracula'
                });

                const update = () => updatePreview(preview6, doc.getValue(), videos2.innerHTML);

                refresh6.addEventListener('click', update);

                update();
            });
    }
}

insertSection('section6');
