function updatePreview(iframe, example, videos, needButton) {
    iframe.setAttribute(
        'srcdoc',
        getIFrameHTML({ example, videos, needButton })
    );
}

function getIFrameHTML({ example, videos, needButton }) {
    return `<!DOCTYPE html>
<html>
    <head>
        <style>
            body, html {margin: 0; height: 100%; overflow: hidden; background: black; display: grid;}
            canvas {width: auto; height: 100%; place-self: center;}
            video, img {display: none;}
            .clickable {cursor: pointer;}
            .button {
                position: absolute;
                padding: 10px 20px;
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                cursor: pointer;
            }
        </style>
        <script type="module" src="../index.js"></script>
        <script src="./utils.js"></script>
    </head>
    <body>
        ${videos}
        <canvas id="target"></canvas>
        ${
            needButton
                ? '<div id="button" class="button">Click to transition</div>'
                : ''
        }
        <script type="module">
            ${example}
        </script>
        <!-- Temp: library to add control -->
        <script src="https://cdn.jsdelivr.net/npm/lil-gui@0.20"></script>
        <!-- Temp: library for smooth easing -->
        <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js"></script>
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
                    ids.needButton
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
    section10() {
        startDemo('./deformation.js', {
            code: 'code10',
            preview: 'preview',
            video: 'videos6',
            refresh: 'refresh10',
        });
    },
    section11() {
        startDemo('./channel-split.js', {
            code: 'code11',
            preview: 'preview',
            refresh: 'refresh11',
        });
    },

    section12() {
        startDemo('./multi-pointer.js', {
            code: 'code12',
            preview: 'preview',
            refresh: 'refresh12',
        });
    },

    section13() {
        startDemo('./shape-transition.js', {
            code: 'code13',
            preview: 'preview',
            video: 'videos2',
            refresh: 'refresh13',
            needButton: true,
        });
    },
};

insertSection('section11');

// on load get active section from url hash and set
const hash = window.location.hash.substring(1);

if (hash) {
    const section = document.querySelector(`#${hash}`);
    if (section) {
        insertSection(hash);
    }
}
