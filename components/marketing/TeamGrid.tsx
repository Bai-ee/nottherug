import Link from 'next/link';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  photo: string;
  photoSize: string;
  photoPosition: string;
}

const TEAM: TeamMember[] = [
  {
    name: 'Luis', role: 'Founder & Lead Walker',
    bio: 'A former SiriusXM Program Director and Red Bull music strategist, Luis traded the broadcast world for Brooklyn sidewalks. He founded Not The Rug in 2011 after discovering dog walking on the Upper West Side. A Williamsburg resident since 2006, he knows the blocks, the parks, and most of the dogs by name.',
    photo: '/img/team/luis.jpg', photoSize: '150%', photoPosition: '48% 40%',
  },
  {
    name: 'Lincoln', role: 'Manager & Senior Walker',
    bio: 'Originally from South Louisiana, with roots in DownEast Maine, Lincoln grew up surrounded by animals, including dogs, miniature donkeys, and even emus. If it had four legs or feathers, she likely helped care for it. Four years ago, Lincoln moved to Brooklyn with her three Southern pups, bringing her deep respect for animals with her. Her understanding of animal behavior, along with her steady and generous approach, makes her a trusted presence on the team. Now a Williamsburg local, Lincoln feels lucky to do this work every day.',
    photo: '/img/team/lincoln.jpg', photoSize: '275%', photoPosition: '46% 48%',
  },
  {
    name: 'Marcus', role: 'Senior Walker',
    bio: "Marcus has spent his life around animals, from growing up with pets to working as a dog trainer at Petco. He brings a thoughtful understanding of how dogs communicate, learn, and respond. A theater kid, video gamer, curious thinker, and devoted animal lover, Marcus sees every walk as a chance to build trust and connection. Say hello when you see him in the neighborhood — he's always happy to meet pups and their people.",
    photo: '/img/team/marcus.jpg', photoSize: '275%', photoPosition: '48% 3%',
  },
  {
    name: 'Christian', role: 'Senior Walker',
    bio: 'Christian spent more than six years working as a chef and kitchen manager, where he developed discipline, focus, and strong attention to detail. Over time, he realized he wanted work that felt more grounded and connected. With a lifelong love for animals, Christian chose a new path that brought more balance into his life. He brings patience, care, and a steady presence to every walk, treating each dog with the same respect he would give his own.',
    photo: '/img/team/christian.jpg', photoSize: '170%', photoPosition: '60% 42%',
  },
  {
    name: 'Shawn', role: 'Walker',
    bio: "Shawn brings care, precision, and a calm presence to every walk. An artist, musician, and visual creator, he approaches dog care with patience and intention. Before joining Not The Rug, Shawn spent two years with another service and came to us wanting a more thoughtful approach to the work. He has been a strong addition to the team, and we're glad to have him.",
    photo: '/img/team/shawn.jpg', photoSize: '290%', photoPosition: '53% 3%',
  },
  {
    name: 'Yenny', role: 'Walker',
    bio: "Yenny is an experienced dog walker and a returning member of the Not The Rug team. Before joining us, she spent three years managing a doggy daycare in Long Island City, working with dogs of all personalities and energy levels. After stepping away to have her baby, Yenny is back with us and already reconnecting with the neighborhood pups. We're excited to have her back.",
    photo: '/img/team/yenny.jpg', photoSize: '265%', photoPosition: '47% 9%',
  },
];

export default function TeamGrid() {
  return (
    <div className="grid-3">
      {TEAM.map((member) => (
        <div className="team-card card-hover" key={member.name}>
          <div
            className="team-photo"
            style={{ height: '280px', backgroundImage: `url('${member.photo}')`, backgroundSize: member.photoSize, backgroundPosition: member.photoPosition }}
            role="img"
            aria-label={`${member.name}, Not The Rug dog walker`}
          ></div>
          <div className="team-info">
            <div className="team-name">{member.name}</div>
            <div className="team-role">{member.role}</div>
            <p className="team-bio">{member.bio}</p>
          </div>
        </div>
      ))}
      <div id="join-team-card" className="team-card" style={{ gridColumn: '1 / -1', border: '2px dashed var(--sage-light)', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '10px' }}>Join the team</h4>
        <p style={{ fontSize: '14px', color: 'var(--mid-gray)', marginBottom: '20px' }}>We hire experienced, passionate walkers who want to build real relationships — not just fill shifts.</p>
        <Link href="/contact" className="btn btn-outline btn-sm">Learn More</Link>
      </div>
    </div>
  );
}
