// Educational content: real, well-documented software incidents.
// Every claim here was verified against the cited sources at publication
// (Sept 2026). If you extend this list, verify the new entry the same way.

export type Incident = {
  slug: string;
  name: string;
  year: string;
  impact: string; // one-line, sourced impact summary for the index row
  category: string; // reuses the practice-challenge taxonomy
  related: { id: string; title: string }[]; // practice challenges that teach the same skill
  sources: { label: string; url: string }[];
  whatHappened: string;
  symptom: string;
  rootCause: string;
  resolution: string;
  lesson: string;
};

export const incidents: Incident[] = [
  {
    slug: "knight-capital",
    impact: "≈$440M lost in 45 minutes",
    name: "Knight Capital",
    year: "2012",
    category: "Environment / configuration bug",
    related: [
      { id: "works-on-my-machine", title: "Works On My Machine" },
      { id: "the-missing-name", title: "The Missing Name" },
    ],
    sources: [
      { label: "SEC administrative order charging Knight Capital (Oct 16, 2013)", url: "https://www.sec.gov/news/press-release/2013-141" },
      { label: "Wikipedia — Knight Capital Group", url: "https://en.wikipedia.org/wiki/Knight_Capital_Group" },
    ],
    whatHappened:
      "On August 1, 2012, the trading firm Knight Capital lost approximately $440 million in about 45 minutes. The company was rescued from bankruptcy by a $400 million investment days later and was acquired soon after. A forty-five-minute deployment mistake ended an eighteen-year-old firm.",
    symptom:
      "The market opened, and one of Knight’s automated systems started buying at high prices and selling at low prices — millions of times. The firm’s risk systems and the exchange both noticed strange order flow, but for the first minutes nobody could tell which of the company’s many systems was misbehaving or how to stop it.",
    rootCause:
      "Knight was rolling out new routing code for a stock-exchange program to eight servers — by hand, one at a time. A technician forgot to copy one of the new files to one of the eight servers. That server still contained a piece of long-retired order-routing code (nicknamed Power Peg) that had been left in place, dead, for years. The new code reused an old configuration flag; on the seven up-to-date servers the flag did the intended job, but on the stale server it reactivated the retired code, which bought high and sold low and re-triggered itself millions of times.",
    resolution:
      "The loss only stopped when the flag was turned off and the server taken out of rotation — the code itself had no working off switch. Knight was left with a huge unintended position that took days to unwind. The SEC later charged the firm with violating market-access rules and ordered it to pay $12 million. After the rescue investment, Knight merged with its rescuer.",
    lesson:
      "Manual deployments eventually meet the server that was missed — deployments should be automated and identical everywhere. Dead code is never harmless: code you don’t run today can still be reactivated by tomorrow’s flag. And a flag that once meant one thing should never be quietly repurposed to mean another.",
  },
  {
    slug: "cloudflare-regex-outage",
    impact: "80% of edge traffic down",
    name: "Cloudflare global outage",
    year: "2019",
    category: "Search / literal query handling",
    related: [
      { id: "the-search-that-guesses", title: "The Search That Guesses" },
      { id: "the-ghost-update", title: "The Ghost Update" },
    ],
    sources: [
      { label: "Cloudflare postmortem — Details of the Cloudflare outage on July 2, 2019", url: "https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/" },
    ],
    whatHappened:
      "On July 2, 2019, a single regular expression pushed out as part of a Cloudflare firewall rule update brought down a large share of the internet’s traffic for 27 minutes. Cloudflare sits in front of millions of websites, and for those 27 minutes a big fraction of the requests passing through its network failed with HTTP 502 errors — the company’s own SRE team measured roughly 80% of traffic lost at its peak.",
    symptom:
      "Minutes after the rule was deployed, CPU usage on Cloudflare’s edge machines hit 100% worldwide and every core serving traffic stalled. Websites behind Cloudflare returned 502 Bad Gateway errors. The Cloudflare dashboard and API — which run through the same edge — also went down, briefly making the incident harder to diagnose and even harder to communicate about.",
    rootCause:
      "The rule contained a regular expression with a pattern that reduced to the shape .*.*=.* — nested, overlapping wildcards. The regex engine in use (PCRE) allows catastrophic backtracking: on certain inputs it re-tries the same combinations exponentially, with no time limit. One specific real-world request sent the engine into effectively unbounded backtracking, and because the rule ran on every edge server, one bad pattern froze the whole network. A staging step that would normally have caught the CPU spike was skipped during that particular rollout.",
    resolution:
      "Engineers identified the WAF rule as the cause within about eighteen minutes and executed a global “terminate” of the firewall at 14:07 UTC; traffic and CPU recovered by 14:09. The WAF was re-enabled two hours later after testing. Afterwards, Cloudflare re-added a CPU-protection guard that had been accidentally dropped, audited all 3,868 of its managed rules for backtracking risk, began migrating to regex engines with linear-time guarantees, and made staged rollouts mandatory for firewall changes.",
    lesson:
      "A regex is a program, and a naive one can run forever. Anything that evaluates user-supplied input with a regex needs a runtime complexity guard or a linear-time engine. And a deployment process that sometimes skips its safety checks will eventually skip them at the worst possible moment.",
  },
  {
    slug: "aws-s3-outage",
    impact: "4+ hours of S3 down",
    name: "AWS S3 outage",
    year: "2017",
    category: "Environment / configuration bug",
    related: [
      { id: "works-on-my-machine", title: "Works On My Machine" },
      { id: "the-silent-crash", title: "The Silent Crash" },
    ],
    sources: [
      { label: "AWS — Summary of the Amazon S3 Service Disruption in Northern Virginia (Feb 28, 2017)", url: "https://aws.amazon.com/message/41926/" },
    ],
    whatHappened:
      "On February 28, 2017, Amazon’s S3 storage service — which backs a huge portion of the internet — had a more-than-four-hour outage in its Northern Virginia region starting at 9:37 AM PST. Thousands of dependent websites, apps, and devices failed along with it, not because they ran on the broken subsystem but because they depended on S3 for images, files, and configuration.",
    symptom:
      "From the outside, S3 in us-east-1 started returning errors for basic operations — reads, writes, and listings all failed. Because the dashboard and administrative tools also relied on S3, Amazon’s own status reporting was delayed, so for a stretch of time operators everywhere could see their systems failing without being able to see why.",
    rootCause:
      "An authorized S3 engineer was debugging a slower-than-normal billing subsystem and ran an established command to take a small number of servers out of service. One of the command’s inputs was mistyped, and a much larger set of servers was removed — including servers behind two other S3 subsystems. One of them, the index subsystem that tracks metadata and object locations for the region, could not be restarted quickly, and S3 cannot serve objects without it. The AWS postmortem is candid that the tooling allowed far too much damage from a single command, and that the team had planned for component failures but underweighted the failure mode of one quick operator action hitting several subsystems at once.",
    resolution:
      "The affected subsystems were restarted and S3 returned to normal by about 1:54 PM PST. Amazon then removed the ability of that tool to take out so many servers at once, added recovery tooling and a rehearsed recovery plan for the index subsystem, split control-plane operations so one region’s maintenance can’t take down global tooling, and published the full postmortem within two days.",
    lesson:
      "Operational tools deserve the same design scrutiny as product features: a maintenance command that can remove the wrong servers is a loaded weapon with no safety catch. Blast radius is a design decision — dangerous actions should be segmented, confirmable, and reversible, especially for the humans having the worst day of their month.",
  },
  {
    slug: "therac-25",
    impact: "Six overdoses, some fatal",
    name: "Therac-25",
    year: "1985–1987",
    category: "Async / race condition",
    related: [
      { id: "the-ghost-update", title: "The Ghost Update" },
      { id: "the-room-that-wont-leave", title: "The Room That Won’t Leave" },
    ],
    sources: [
      { label: "Leveson & Turner — An Investigation of the Therac-25 Accidents (IEEE Computer, 1993)", url: "https://web.stanford.edu/class/cs240/old/sp2014/readings/therac-25.pdf" },
      { label: "Wikipedia — Therac-25", url: "https://en.wikipedia.org/wiki/Therac-25" },
    ],
    whatHappened:
      "Between 1985 and 1987, the Therac-25 — a radiation therapy machine built by Atomic Energy of Canada Limited — delivered massive accidental radiation overdoses to patients in at least six documented accidents, some of them fatal. The intended treatment dose could be exceeded hundreds of times over. It remains one of the most studied disasters in software engineering, and it is taught in ethics courses as well as engineering ones.",
    symptom:
      "The machine reported cryptic errors — most famously “Malfunction 54” — with no explanation of what was wrong, and operators, trained to keep treating patients, often pressed on. The overdoses didn’t happen on every machine or every day: they appeared only when operators, after long practice, entered treatment parameters quickly. That timing dependence made the bug nearly impossible to reproduce on demand and let the manufacturer initially blame equipment faults and deny the possibility of a software overdose.",
    rootCause:
      "Two problems compounded. First, the software had a race condition: the operator interface and the beam-control code ran concurrently, and when certain commands were entered within a few seconds of each other, an internal counter could overflow and leave the machine set to deliver a high-power beam with the spreading target absent — the configuration that caused the overdoses. Second, the Therac-25 relied on software alone for safety, whereas its predecessors had included hardware interlocks that would have caught at least some of these failures. The unsafe code had also been carried forward from earlier machines, so its flaws were inherited rather than invented.",
    resolution:
      "Physicists and hospital staff pushed back against the manufacturer’s initial denials, and independent analysis eventually connected the accidents to the software. AECL recalled and redesigned the machines in 1987 with extensive changes to software and safety architecture. Nancy Leveson and Clark Turner’s 1993 investigation became the definitive study and required reading in software-safety and computer-ethics education.",
    lesson:
      "Race conditions in concurrent code aren’t just lost search results — under the wrong circumstances they are safety failures. Safety-critical systems need defense in depth: software bugs are inevitable, so hardware interlocks, fail-safe defaults, and independent checks must exist to catch them. And a manufacturer that can’t reproduce a bug still has to take it seriously.",
  },
];

export function getIncident(slug: string) {
  return incidents.find((incident) => incident.slug === slug);
}
