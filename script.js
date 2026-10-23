const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("year").textContent = new Date().getFullYear();

// light / dark mode
(function modeToggle(){
    const btn = document.getElementById("mode-toggle");
    const meta = document.querySelector('meta[name="theme-color"]');

    function sync(){
        const light = document.documentElement.dataset.mode === "light";
        btn.setAttribute("aria-pressed", String(light));
        meta.content = light ? "#f6f2f7" : "#03040a";
    }

    btn.addEventListener("click", () => {
        const light = document.documentElement.dataset.mode !== "light";
        if (light) document.documentElement.dataset.mode = "light";
        else delete document.documentElement.dataset.mode;
        try { localStorage.setItem("mode", light ? "light" : "dark"); } catch {}
        sync();
    });

    sync();
})();

// typewriter tagline
(function typewriter(){
    const el = document.getElementById("typed");
    const lines = el.dataset.lines.split("|");
    if (reducedMotion) return;

    let line = 0;
    let pos = lines[0].length;
    let deleting = true;

    function tick(){
        const text = lines[line];
        if (deleting){
            pos--;
            el.textContent = text.slice(0, pos);
            if (pos === 0){
                deleting = false;
                line = (line + 1) % lines.length;
            }
            setTimeout(tick, 35);
        } else {
            const next = lines[line];
            pos++;
            el.textContent = next.slice(0, pos);
            if (pos === next.length){
                deleting = true;
                setTimeout(tick, 2600);
            } else {
                setTimeout(tick, 70);
            }
        }
    }
    setTimeout(tick, 2600);
})();

// reveal sections on scroll + highlight active nav link
(function scrollEffects(){
    const sections = document.querySelectorAll(".reveal");
    const navLinks = document.querySelectorAll(".site-header nav a");

    if (!("IntersectionObserver" in window)){
        sections.forEach(s => s.classList.add("visible"));
        return;
    }

    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting){
                entry.target.classList.add("visible");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    sections.forEach(s => revealObserver.observe(s));

    const navObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            navLinks.forEach(a => {
                a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
            });
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => navObserver.observe(s));
})();

// interactive terminal
(function terminal(){
    const term = document.getElementById("terminal");
    const form = document.getElementById("terminal-form");
    const input = document.getElementById("terminal-cmd");
    const ps1 = document.getElementById("terminal-ps1");
    const output = document.getElementById("terminal-output");
    const history = [];
    let historyIndex = 0;
    let user = "guest";
    let awaitingPassword = false;
    let busy = false;

    const links = {
        github: "https://github.com/luka-ivanovic",
        linkedin: "https://www.linkedin.com/in/luka-ivanovic-",
    };

    // no peeking at the source for the flags ;)
    const FLAGS = [
        "ZmxhZ3tyMDB0XzBuX2x1a2FpdmFub3ZpYy5kZXZ9",
        "ZmxhZ3t4MHJfMXNfbjB0XzNuY3J5cHQxMG59",
    ];
    const ROOT_PW = "aHVudGVyMg==";
    const CRACKME_KEY = "2e232f202623";
    const found = new Set();
    const sessionStart = Date.now();

    const dirs = ["kerma-node/", "systems-c/", "gameio/", ".secret/"];
    const listing = "kerma-node/  systems-c/  gameio/  README.md  crackme*  flag.txt";

    const themes = {
        neon: ["#d41c74", "#e661a3"],
        green: ["#7ee787", "#56d4dd"],
        amber: ["#ffb000", "#ffd27a"],
        cyan: ["#56d4dd", "#a5b4fc"],
        red: ["#ff6b81", "#ffb3c1"],
        purple: ["#c4a7ff", "#7ee787"],
    };

    const fortunes = [
        "There are 10 kinds of people: those who understand binary and those who don't.",
        "It works on my machine. — every developer, ever",
        "A SQL query walks into a bar, goes up to two tables and asks: 'Can I join you?'",
        "Segmentation fault (core dumped). Your fortune was in that core.",
        "The S in IoT stands for security.",
        "Real programmers count from 0.",
        "To understand recursion, you must first understand recursion.",
        "There's no place like 127.0.0.1",
        "Security through obscurity is like hiding your house key under the doormat. with a sign.",
        "!false — it's funny because it's true.",
    ];

    const processes = [
        "  PID USER     %CPU %MEM COMMAND",
        "    1 root      0.0  0.1 /sbin/init",
        "  420 luka     99.9  4.2 gdb ./chall",
        "  666 luka     12.3  8.0 vim exploit.py",
        " 1337 guest     0.1  0.2 bash",
        " 2048 luka      3.1 31.4 chrome (47 tabs of ctf writeups)",
        " 9001 luka      0.0  0.0 sleep infinity   # aka studying",
    ];

    function foundFlag(i){
        const first = !found.has(i);
        found.add(i);
        return { cls: "warn", text: first
            ? "[+] flag " + (i + 1) + "/" + FLAGS.length + " captured! (`flags` for your score)"
            : "[i] you already have this one." };
    }

    const files = {
        "flag.txt": () => {
            if (user !== "root"){
                return [{ cls: "err", text: "cat: flag.txt: Permission denied (owner: root)" }];
            }
            return [{ cls: "ok", text: atob(FLAGS[0]) }, foundFlag(0)];
        },
        "crackme": () => [{ cls: "dim", text: "\u007fELF ��H��u�1�@�� key_check ��� ...(binary garbage — maybe try `strings crackme`)" }],
        ".bash_history": () => [
            "cd ~/ctf/pwn && gdb ./chall",
            "vim exploit.py",
            "python3 exploit.py REMOTE",
            "su root",
            "# note to self: stop forgetting the root pw. stashed it in .secret/",
            "history -c   # TODO: actually run this",
        ],
        ".secret/pw.b64": () => [ROOT_PW],
        "README.md": () => ["# lukaivanovic.dev", "hi :) look around. try `ls -a`."],
        "/etc/passwd": () => [
            "root:x:0:0:root:/root:/bin/bash",
            "luka:x:1000:1000:Luka Ivanovic:/home/luka:/bin/zsh",
            "guest:x:1337:1337:curious visitor:/home/guest:/bin/bash",
        ],
        "/etc/shadow": () => user === "root"
            ? ["root:$y$j9T$n0p3$n0t_th1s_t1m3:20000:0:99999:7:::"]
            : [{ cls: "err", text: "cat: /etc/shadow: Permission denied. nice try though." }],
    };

    const commands = {
        help: () => [
            "available commands:",
            "  whoami      who are you?",
            "  about       who is luka?",
            "  ls          list files",
            "  cat <file>  print a file",
            "  github      open GitHub profile",
            "  linkedin    open LinkedIn profile",
            "  neofetch    system info",
            "  fortune     words of wisdom",
            "  theme <c>   change colors (green, amber, cyan, red, purple)",
            "  flags       your CTF score",
            "  hint        stuck? ask for a hint",
            "  history     command history",
            "  clear       clear the screen",
            { cls: "dim", text: "  ...and a lot of commands that aren't listed here." },
        ],
        crackme: () => [{ cls: "err", text: "crackme: command not found. did you mean ./crackme?" }],
        about: () => ["luka — CS student @ TU Wien. reverse engineering, binary analysis, CTFs, crypto."],
        whoami: () => [user],
        id: () => [user === "root"
            ? "uid=0(root) gid=0(root) groups=0(root)"
            : "uid=1337(guest) gid=1337(guest) groups=1337(guest),27(not-sudo)"],
        ls: args => {
            if (args.some(a => a.replace(/\/$/, "") === ".secret")) return ["pw.b64"];
            const all = args.some(a => /^-\w*a/.test(a));
            if (args.some(a => /^-\w*l/.test(a))){
                return [
                    "total 42",
                    ...(all ? [
                        "drwxr-xr-x 1 guest guest 4096 .",
                        "drwxr-xr-x 1 root  root  4096 ..",
                        "-rw------- 1 guest guest  271 .bash_history",
                        "drwx------ 1 guest guest 4096 .secret",
                    ] : []),
                    "drwxr-xr-x 1 luka  luka  4096 kerma-node",
                    "drwxr-xr-x 1 luka  luka  4096 systems-c",
                    "drwxr-xr-x 1 luka  luka  4096 gameio",
                    "-rw-r--r-- 1 luka  luka    64 README.md",
                    "-rwxr-xr-x 1 luka  luka  8192 crackme",
                    "-r-------- 1 root  root    31 flag.txt",
                ];
            }
            return [(all ? ".  ..  .bash_history  .secret/  " : "") + listing];
        },
        ll: () => commands.ls(["-la"]),
        tree: () => [
            ".",
            "├── kerma-node/",
            "├── systems-c/",
            "├── gameio/",
            "├── README.md",
            "├── crackme",
            "└── flag.txt",
            "",
            "3 directories, 3 files   (+ some hidden ones 👀)",
        ],
        strings: args => args[0] && args[0].replace(/^\.\//, "") === "crackme"
            ? [
                "/lib64/ld-linux-x86-64.so.2",
                "puts", "strlen", "printf",
                "usage: ./crackme <key>",
                "key_check: xor every byte with 0x42",
                "expected: " + CRACKME_KEY,
                "nope. try harder.",
                "GCC: (GNU) 14.2.1",
            ]
            : [{ cls: "err", text: "strings: '" + (args[0] || "") + "': No such file" }],
        file: args => args[0] && args[0].replace(/^\.\//, "") === "crackme"
            ? ["crackme: ELF 64-bit LSB pie executable, x86-64, dynamically linked, not stripped"]
            : [(args[0] || "?") + ": ASCII text, probably"],
        "./crackme": args => {
            if (!args.length) return ["usage: ./crackme <key>"];
            const hex = Array.from(args.join(" "), c => (c.charCodeAt(0) ^ 0x42).toString(16).padStart(2, "0")).join("");
            if (hex !== CRACKME_KEY) return [{ cls: "err", text: "nope. try harder." }];
            return [{ cls: "ok", text: "correct! " + atob(FLAGS[1]) }, foundFlag(1)];
        },
        gdb: args => [
            "GNU gdb (GDB) 15.1 + pwndbg",
            args.length ? "Reading symbols from " + args.join(" ") + "..." : "pwndbg> _",
            { cls: "dim", text: "(this terminal's too small for a debugger — `strings` gets you further)" },
        ],
        flags: () => [
            "captured " + found.size + "/" + FLAGS.length + " flags",
            ...FLAGS.map((_, i) => (found.has(i) ? "  [x] " : "  [ ] ") + ["root the box", "crack the crackme"][i]),
        ],
        submit: args => {
            const i = FLAGS.findIndex(f => atob(f) === args.join(" "));
            return i < 0 ? [{ cls: "err", text: "wrong flag." }] : [foundFlag(i)];
        },
        cat: args => {
            if (!args.length) return [{ cls: "err", text: "cat: missing operand" }];
            const name = args[0].replace(/^(\.\/|~\/)/, "");
            if (Object.prototype.hasOwnProperty.call(files, name)) return files[name]();
            if (dirs.includes(name) || dirs.includes(name + "/")){
                return [{ cls: "err", text: "cat: " + args[0] + ": Is a directory" }];
            }
            return [{ cls: "err", text: "cat: " + args[0] + ": No such file or directory" }];
        },
        cd: args => {
            const dir = (args[0] || "").replace(/\/$/, "");
            if (dir === ".secret") return ["(this shell is too lazy for cd — try `cat .secret/<file>`)"];
            if (dir === "" || dir === "~") return [];
            return [{ cls: "err", text: "cd: permission denied: luka doesn't let guests wander around" }];
        },
        base64: args => {
            const decode = args.includes("-d") || args.includes("--decode");
            const data = args.filter(a => !a.startsWith("-")).join(" ");
            if (!data) return [{ cls: "err", text: "usage: base64 [-d] <string>" }];
            try {
                return [decode ? atob(data) : btoa(data)];
            } catch {
                return [{ cls: "err", text: "base64: invalid input" }];
            }
        },
        su: args => {
            if (args[0] && args[0] !== "root" && args[0] !== "-"){
                return [{ cls: "err", text: "su: user " + args[0] + " does not exist or is too cool for you" }];
            }
            if (user === "root") return ["you're already root, relax."];
            awaitingPassword = true;
            input.type = "password";
            ps1.textContent = "Password:";
            return [];
        },
        sudo: args => {
            const rest = args.join(" ");
            if (rest === "make me a sandwich") return [{ cls: "ok", text: "Okay." }];
            if (user === "root") return rest ? run(rest) : [];
            return [{ cls: "err", text: "guest is not in the sudoers file. This incident will be reported." }];
        },
        exit: () => {
            if (user === "root"){
                setUser("guest");
                return ["logout"];
            }
            return ["there is no escape. try `help`."];
        },
        logout: () => commands.exit(),
        github: () => openLink("github"),
        linkedin: () => openLink("linkedin"),
        contact: () => ["reach me on github or linkedin — try `github` or `linkedin`."],
        date: () => [new Date().toString()],
        echo: args => [args.join(" ")],
        pwd: () => [user === "root" ? "/root" : "/home/guest"],
        hostname: () => ["lukaivanovic.dev"],
        uname: () => ["Linux lukaivanovic.dev 6.6.6-luka #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux"],
        history: () => history.map((h, i) => String(i + 1).padStart(4) + "  " + h),
        clear: () => { output.innerHTML = ""; return []; },
        neofetch: () => [{ cls: "art", text: [
            "    __          " + user + "@lukaivanovic.dev",
            "    \\ \\         -----------------------",
            "     \\ \\        OS: LukaOS (Arch btw)",
            "      \\ \\       Kernel: 6.6.6-luka",
            "      /  \\      Shell: bash 5.2",
            "     / /\\ \\     Editor: vim (can't exit)",
            "    / /  \\ \\    Debugger: GDB + Pwndbg",
            "   /_/    \\_\\   Uptime: " + uptime(),
            "                Resolution: " + window.innerWidth + "x" + window.innerHeight,
            "                Caffeine: critical",
        ].join("\n") }],
        uptime: () => ["up " + uptime() + ", 1 user, load average: 0.42, 0.13, 0.37"],
        fortune: () => [fortunes[Math.floor(Math.random() * fortunes.length)]],
        joke: () => commands.fortune(),
        ps: () => processes,
        top: () => [...processes, { cls: "dim", text: "(press q to quit — just kidding, it's not interactive)" }],
        htop: () => commands.top(),
        kill: args => args.includes("1")
            ? [{ cls: "err", text: "kill: (1) - Operation not permitted. you tried to kill init. bold." }]
            : args.includes("9001")
                ? [{ cls: "ok", text: "studying terminated. luka thanks you." }]
                : [{ cls: "err", text: "kill: you can't kill what you don't own." }],
        man: args => args[0]
            ? [args[0].toUpperCase() + "(1)", "  NAME", "    " + args[0] + " - does " + args[0] + " things.", "  SEE ALSO", "    help(1), google(1), stackoverflow(1)"]
            : ["What manual page do you want?", "For example, try 'man man'."],
        which: args => args[0] === "luka"
            ? ["/home/luka (probably in a debugger)"]
            : Object.prototype.hasOwnProperty.call(commands, args[0] || "")
                ? ["/usr/bin/" + args[0]]
                : [{ cls: "err", text: (args[0] || "") + " not found" }],
        whois: args => (args[0] || "").toLowerCase() === "luka"
            ? ["Name:   Luka Ivanovic", "Role:   CS student / aspiring security researcher", "Status: probably reversing something", "Links:  try `github` or `linkedin`"]
            : [{ cls: "err", text: "whois: no match for \"" + (args[0] || "") + "\"" }],
        git: args => {
            const sub = args.join(" ");
            if (sub.startsWith("log")) return [
                "a1b2c3d (HEAD -> main) fix typo. again.",
                "d4e5f6a final version",
                "0badc0d final version (for real)",
                "deadbee final_v2_actually_final",
                "c0ffee1 initial commit",
            ];
            if (sub.startsWith("blame")) return ["it was luka. it's always luka."];
            if (sub.startsWith("push")) return [{ cls: "err", text: "remote: Permission to luka-ivanovic denied to guest. nice try." }];
            if (sub.startsWith("status")) return ["On branch main", "nothing to commit, working tree clean (for once)"];
            return ["usage: git [log|status|blame|push]"];
        },
        ssh: () => [{ cls: "err", text: "Permission denied (publickey). you're already in, just use this shell." }],
        nc: () => ["listening on [any] 1337 ... (nobody's calling)"],
        curl: args => args.length ? ["<html>it's turtles all the way down</html>"] : ["curl: try 'curl --help'"],
        wget: args => commands.curl(args),
        python: () => [">>> import antigravity", "flying. (exit with `exit()` — or don't, it's not real)"],
        python3: () => commands.python(),
        "exit()": () => ["bye python 👋"],
        apt: () => commands.pacman(),
        "apt-get": () => commands.pacman(),
        pacman: () => {
            later([
                ":: Synchronizing package databases...",
                " core          [##########################] 100%",
                " extra         [##########################] 100%",
                ":: Starting full system upgrade...",
                " there is nothing to do. (i use arch btw)",
            ], 350);
            return [];
        },
        yay: () => commands.pacman(),
        sl: () => {
            later([
                "      ====        ________                ___________",
                "  _D _|  |_______/        \\__I_I_____===__|_________|",
                "   |(_)---  |   H\\________/ |   |        =|___ ___|",
                "   /     |  |   H  |  |     |   |         ||_| |_||",
                "  |      |  |   H  |__--------------------| [___] |",
                "  | ________|___H__/__|_____/[][]~\\_______|       |",
                "  |/ |   |-----------I_____I [][] []  D   |=======|_",
                { cls: "dim", text: "choo choo! (you meant `ls`)" },
            ], 120);
            return [];
        },
        theme: args => {
            const name = (args[0] || "").toLowerCase();
            if (!themes[name]) return ["usage: theme <" + Object.keys(themes).join("|") + ">"];
            applyTheme(name);
            try { localStorage.setItem("theme", name); } catch {}
            return [{ cls: "ok", text: "theme set to " + name + "." }];
        },
        party: () => {
            document.body.classList.toggle("party");
            return [document.body.classList.contains("party") ? "🎉 party mode on (run `party` again to stop)" : "party's over."];
        },
        shutdown: () => reboot(),
        reboot: () => reboot(),
        rickroll: () => [{ cls: "warn", text: "never gonna give you up, never gonna let you down... 🎵" }],
        hint: () => {
            if (!found.has(0)) return ["flag 1: people forget to clear their shell history."];
            if (!found.has(1)) return ["flag 2: binaries often leak secrets to `strings`. xor is its own inverse."];
            return ["no hints left — you got everything. 🏆"];
        },
        alias: () => ["alias ll='ls -la'", "alias please='sudo'", "alias yeet='rm -rf'"],
        please: args => commands.sudo(args),
        yeet: args => commands.rm(["-rf", ...args]),
        cowsay: args => {
            const msg = args.join(" ") || "moo. have you tried `ls -a`?";
            return [{ cls: "art", text: [
                " " + "_".repeat(msg.length + 2),
                "< " + msg + " >",
                " " + "-".repeat(msg.length + 2),
                "        \\   ^__^",
                "         \\  (oo)\\_______",
                "            (__)\\       )\\/\\",
                "                ||----w |",
                "                ||     ||",
            ].join("\n") }];
        },
        vim: () => ["you are now trapped in vim. just kidding — but try `:q!` anyway."],
        vi: () => commands.vim(),
        ":q": () => ["E37: No write since last change (add ! to override)"],
        ":q!": () => [{ cls: "ok", text: "you escaped vim. most people never do." }],
        ":wq": () => [{ cls: "ok", text: "saved & escaped. respect." }],
        nano: () => ["nano? in this house we use vim."],
        emacs: () => ["nice operating system, shame about the editor."],
        coffee: () => [{ cls: "warn", text: "HTTP 418: I'm a teapot." }],
        make: args => args.join(" ") === "me a sandwich"
            ? [{ cls: "err", text: "What? Make it yourself." }]
            : [{ cls: "err", text: "make: *** No targets specified and no makefile found.  Stop." }],
        42: () => ["the answer to life, the universe and everything. now what was the question?"],
        hello: () => ["hi there 👋"],
        hi: () => commands.hello(),
        ping: args => {
            const host = args[0] || "lukaivanovic.dev";
            later([
                "PING " + host + " 56(84) bytes of data.",
                "64 bytes from " + host + ": icmp_seq=1 ttl=64 time=0.42 ms",
                "64 bytes from " + host + ": icmp_seq=2 ttl=64 time=0.37 ms",
                "64 bytes from " + host + ": icmp_seq=3 ttl=64 time=0.39 ms",
                "--- " + host + " ping statistics: 3 packets transmitted, 3 received, 0% packet loss",
            ], 400);
            return [];
        },
        nmap: () => {
            later([
                "Starting Nmap 7.95 ( https://nmap.org )",
                "Nmap scan report for lukaivanovic.dev (127.0.0.1)",
                "PORT      STATE   SERVICE",
                "22/tcp    closed  ssh      (nice try)",
                "80/tcp    open    http",
                "443/tcp   open    https",
                { cls: "warn", text: "1337/tcp  open    elite    (psst: the real way in is `su`)" },
                "Nmap done: 1 IP address (1 host up) scanned in 1.37 seconds",
            ], 300);
            return [];
        },
        hack: () => {
            later([
                "[*] initializing exploit framework...",
                "[*] bypassing firewall... ok",
                "[*] downloading more RAM... 16GB ok",
                "[*] hacking the mainframe...",
                "[*] enhancing... enhancing... ENHANCING...",
                "[*] reversing the polarity of the neutron flow...",
                { cls: "err", text: "[!] access denied. real hackers read .bash_history." },
            ], 450);
            return [];
        },
        matrix: () => {
            matrix();
            return [{ cls: "ok", text: "wake up, neo... (click or press any key to exit)" }];
        },
        rm: args => {
            if (/^-(rf|fr) \/\*?( --no-preserve-root)?$/.test(args.join(" "))){
                document.body.classList.add("shake", "melt");
                busy = true;
                setTimeout(() => {
                    document.body.classList.remove("shake", "melt");
                    print({ cls: "ok", text: "just kidding. this site is static, you can't hurt it :)" });
                    busy = false;
                }, 1600);
                return [{ cls: "err", text: "rm: deleting everything..." }];
            }
            return [{ cls: "err", text: "rm: nice try." }];
        },
        xyzzy: () => ["Nothing happens."],
        flag: () => ["flags don't just hand themselves out. well... maybe `ls` first."],
    };

    function run(raw){
        const lower = raw.toLowerCase();
        if (lower === "do a barrel roll"){
            barrelRoll();
            return ["wheee"];
        }
        const [cmd, ...args] = raw.split(/\s+/);
        const key = cmd.toLowerCase();
        return Object.prototype.hasOwnProperty.call(commands, key)
            ? commands[key](args)
            : [{ cls: "err", text: cmd + ": command not found. try `help`." }];
    }

    function uptime(){
        const s = Math.floor((Date.now() - sessionStart) / 1000);
        return Math.floor(s / 60) + " min " + (s % 60) + " sec";
    }

    function applyTheme(name){
        const [accent, accent2] = themes[name];
        document.documentElement.style.setProperty("--accent", accent);
        document.documentElement.style.setProperty("--accent-2", accent2);
    }

    try {
        const saved = localStorage.getItem("theme");
        if (themes[saved]) applyTheme(saved);
    } catch {}

    function reboot(){
        busy = true;
        output.innerHTML = "";
        setUser("guest");
        later([
            "Broadcast message from root: the system is going down for reboot NOW!",
            "[  OK  ] Stopped target Graphical Interface.",
            "[  OK  ] Reached target Shutdown.",
            "...",
            "[    0.000000] Linux version 6.6.6-luka",
            "[  OK  ] Started Coffee Daemon.",
            "[  OK  ] Reached target Curiosity.",
            "Welcome back! Type `help` to see what you can do here.",
        ], 300);
        return [];
    }

    function setUser(name){
        user = name;
        term.classList.toggle("root", name === "root");
        ps1.textContent = name === "root" ? "root@dev:~#" : "guest@dev:~$";
    }

    function openLink(name){
        window.open(links[name], "_blank", "noopener");
        return [{ cls: "ok", text: "opening " + links[name] + " ..." }];
    }

    function print(line){
        const p = document.createElement("p");
        if (typeof line === "string"){
            p.textContent = line;
        } else {
            p.textContent = line.text;
            p.className = line.cls;
        }
        output.appendChild(p);
        output.scrollTop = output.scrollHeight;
    }

    function later(lines, delay){
        busy = true;
        lines.forEach((line, i) => setTimeout(() => {
            print(line);
            if (i === lines.length - 1) busy = false;
        }, delay * (i + 1)));
    }

    function barrelRoll(){
        document.body.classList.remove("barrel-roll");
        void document.body.offsetWidth;
        document.body.classList.add("barrel-roll");
        setTimeout(() => document.body.classList.remove("barrel-roll"), 1300);
    }

    form.addEventListener("submit", e => {
        e.preventDefault();
        if (busy) return;
        const raw = input.value.trim();
        input.value = "";

        if (awaitingPassword){
            awaitingPassword = false;
            input.type = "text";
            print({ cls: "echo", text: "Password:" });
            if (raw === atob(ROOT_PW)){
                setUser("root");
                print({ cls: "ok", text: "welcome, root. now go read that flag." });
            } else {
                setUser(user);
                print({ cls: "err", text: "su: Authentication failure" });
            }
            return;
        }

        print({ cls: "echo", text: ps1.textContent + " " + raw });
        if (!raw) return;

        history.push(raw);
        historyIndex = history.length;
        run(raw).forEach(print);
    });

    input.addEventListener("keydown", e => {
        if (e.key === "ArrowUp" && historyIndex > 0){
            historyIndex--;
            input.value = history[historyIndex];
            e.preventDefault();
        } else if (e.key === "ArrowDown"){
            historyIndex = Math.min(historyIndex + 1, history.length);
            input.value = history[historyIndex] || "";
            e.preventDefault();
        } else if (e.key === "Tab" && input.value && !awaitingPassword){
            e.preventDefault();
            const parts = input.value.split(" ");
            const last = parts.pop();
            const pool = parts.length
                ? Object.keys(files).concat(dirs)
                : Object.keys(commands).filter(c => /^[a-z]/.test(c));
            const matches = pool.filter(c => c.startsWith(last));
            if (matches.length === 1){
                input.value = parts.concat(matches[0]).join(" ") + (matches[0].endsWith("/") ? "" : " ");
            } else if (matches.length > 1){
                print({ cls: "dim", text: matches.join("  ") });
            }
        } else if (e.key === "l" && e.ctrlKey){
            e.preventDefault();
            output.innerHTML = "";
        }
    });

    document.getElementById("shell-btn").addEventListener("click", () => {
        input.focus({ preventScroll: true });
    });

    term.addEventListener("click", () => {
        if (!window.getSelection().toString()) input.focus();
    });

    // matrix rain (also triggered by the konami code)
    function matrix(){
        if (reducedMotion || document.getElementById("matrix")) return;
        const canvas = document.createElement("canvas");
        canvas.id = "matrix";
        document.body.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        const size = 16;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const drops = Array.from({ length: Math.ceil(canvas.width / size) }, () => Math.random() * -50);
        const chars = "アイウエオカキクケコサシスセソ0123456789LUKAλ$#";

        const timer = setInterval(() => {
            ctx.fillStyle = "rgba(0,0,0,0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#d41c74";
            ctx.font = size + "px monospace";
            drops.forEach((y, i) => {
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, y * size);
                drops[i] = y * size > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
            });
        }, 45);

        function stop(){
            clearInterval(timer);
            canvas.remove();
            document.removeEventListener("keydown", stop);
        }
        canvas.addEventListener("click", stop);
        setTimeout(() => document.addEventListener("keydown", stop), 100);
        setTimeout(stop, 12000);
    }

    const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let konamiPos = 0;
    document.addEventListener("keydown", e => {
        if (e.target === input) return;
        konamiPos = e.key === konami[konamiPos] ? konamiPos + 1 : (e.key === konami[0] ? 1 : 0);
        if (konamiPos === konami.length){
            konamiPos = 0;
            matrix();
        }
    });
})();

// hello, fellow source reader
console.log(
    "%c λ lukaivanovic.dev %c\n\nPoking around in devtools? Respect.\nThere's a terminal at the bottom of the page and a flag hidden in it.\nHint: real hackers read the history.",
    "background:#d41c74;color:#03040a;font-weight:bold;padding:4px 8px;font-family:monospace",
    "color:#d41c74;font-family:monospace"
);
