const STEPS: Array<{ num: string; title: string; copy: string }> = [
  { num: '01', title: 'Reach Out', copy: "Fill out our simple intake form or give us a call. Tell us where you're located in Williamsburg and a little about your dog, including breed, age, weight, personality, quirks, or allergies. We respond within 2 hours on weekdays." },
  { num: '02', title: 'Free Meet & Greet', copy: "We come to your home so your dog can meet their future walker in their own space, on their own terms. We'll review your routine, key handling notes, and answer any questions. No charge, no commitment." },
  { num: '03', title: 'Set Up Your Profile', copy: "Add schedules, vet contacts and records, birthdays, emergency protocols, door codes, and behavioral notes. Your dog's profile travels with their walker on every visit." },
  { num: '04', title: 'First Walk', copy: "Your assigned walker arrives within a 15/30-minute window, starts GPS tracking, and gives your dog a walk. You'll receive a photo report once they're home safe." },
  { num: '05', title: 'Ongoing & Recurring', copy: "Same walker, same time, and a familiar routine built around your dog's preferences. Monthly invoicing, a simple 24-hour cancellation policy, and an open line to us whenever you need it." },
];

export default function ProcessSteps() {
  return (
    <div>
      {STEPS.map((step) => (
        <div className="process-step" key={step.num}>
          <div className="process-num-big">{step.num}</div>
          <div className="process-content">
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
