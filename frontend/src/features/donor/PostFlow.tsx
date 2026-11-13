import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, Plus, X } from 'lucide-react';
import {
  Badge,
  Button,
  Chip,
  Countdown,
  DietMark,
  Field,
  Group,
  IconButton,
  Progress,
  Row,
  Segmented,
  Toggle,
  useToast,
} from '../../components/ui';
import { Page, Panel, Topbar } from '../../components/dash';
import { useAuth } from '../../lib/auth';
import { foodImage } from '../../lib/food';
import { categoryLabel, unitLabel } from '../../lib/format';
import type { Category, Unit } from '../../lib/types';
import { useDonorData } from './DonorData';
import { dayTime, mealsFor, pickupWindow } from './donorKit';
import PhotoDrop from './PhotoDrop';
import TimingStep from './TimingStep';
import { SAFETY, STEPS, usePostForm, type FieldKey, type PostForm } from './usePostForm';
import s from './PostFood.module.css';

const STEP_FIELDS: FieldKey[][] = [['title'], ['quantity'], ['bestBefore', 'pickupFrom', 'pickupUntil'], ['address'], ['checks'], []];
const STEP_NAMES = ['Food', 'Amount', 'Timing', 'Pickup', 'Safety', 'Review'];
const NEXT_UP = [
  'Kitchens nearby see your post right away.',
  'One takes what it needs, all or part.',
  'A volunteer picks it up and brings it there.',
  'Track it live from your dashboard.',
];
const mealText = (v: { quantity: number; unit: Unit }) => {
  const n = mealsFor(v.quantity, v.unit);
  return `${n} ${n === 1 ? 'meal' : 'meals'}`;
};
const CATEGORIES = Object.keys(categoryLabel) as Category[];
const UNITS: Unit[] = ['SERVINGS', 'KG', 'PACKS'];

export default function PostFlow() {
  const { user } = useAuth();
  const { upsert } = useDonorData();
  const navigate = useNavigate();
  const toast = useToast();
  const form = usePostForm(user);
  const [step, setStep] = useState(0);
  const last = STEPS.length - 1;
  const blocker = form.stepBlocker(step);

  const next = async () => {
    STEP_FIELDS[step]!.forEach(form.touch);
    if (blocker) return;
    if (step < last) {
      if (step === 1) form.autofillTimes();
      return setStep(step + 1);
    }
    const res = await form.submit();
    if (res.created) {
      upsert(res.created);
      toast('Posted. Kitchens nearby can see it now.');
      navigate('/donor', { replace: true });
    } else if (res.step !== undefined) setStep(res.step);
  };

  return (
    <Page className={s.page}>
      <Topbar
        title="Post food"
        subtitle={`Step ${step + 1} of ${STEPS.length}`}
        actions={
          <Button variant="secondary" icon={<X size={18} strokeWidth={2} aria-hidden />} onClick={() => navigate('/donor')}>
            Close
          </Button>
        }
      />

      <div className={s.layout}>
        <form
          className={s.card}
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          noValidate
        >
          <div className={s.progress}>
            <Progress value={(step + 1) / STEPS.length} label={`Step ${step + 1} of ${STEPS.length}`} />
          </div>
          <ol className={s.steps} aria-label="Steps">
            {STEP_NAMES.map((name, i) => {
              const dot = <span className={s.stepDot}>{i < step ? <Check size={13} strokeWidth={3} aria-hidden /> : i + 1}</span>;
              const label = <span className={s.stepName}>{name}</span>;
              return (
                <li key={name} data-state={i < step ? 'done' : i === step ? 'current' : 'todo'}>
                  {i === step ? (
                    <span aria-current="step">
                      {dot}
                      {label}
                    </span>
                  ) : (
                    <button type="button" aria-label={name} disabled={i > step} onClick={() => setStep(i)}>
                      {dot}
                      {label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          <div key={step} className={step === 2 ? `${s.step} ${s.stepWide}` : s.step}>
            <h2 className={s.question}>{STEPS[step]}</h2>
            {step === 0 && form.restored && (
              <p className={s.draft}>
                We kept your last draft.{' '}
                <button type="button" onClick={form.discardDraft}>
                  Start over
                </button>
              </p>
            )}
            {step === 0 && <What form={form} />}
            {step === 1 && <HowMuch form={form} />}
            {step === 2 && <TimingStep form={form} />}
            {step === 3 && <Where form={form} />}
            {step === 4 && <Safety form={form} />}
            {step === 5 && <Review form={form} />}
          </div>

          {form.formError && (
            <p role="alert" className={s.formError}>
              {form.formError}
            </p>
          )}

          <footer className={s.actions}>
            {step > 0 && (
              <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button type="submit" size="lg" className={s.grow} loading={form.submitting} disabled={step === last && !!blocker}>
              {step === last ? 'Post food' : 'Continue'}
            </Button>
          </footer>
        </form>

        <aside className={s.side} data-review={step === last || undefined}>
          <Preview form={form} />
          <Panel title="What happens next" className={s.nextPanel}>
            <ol className={s.next}>
              {NEXT_UP.map((t, i) => (
                <li key={t}>
                  <span>{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </Page>
  );
}

// Live card showing the post the way volunteers will see it
function Preview({ form }: { form: PostForm }) {
  const { values } = form;
  const title = values.title.trim();
  return (
    <section className={s.previewCard} aria-label="Preview">
      <p className={s.previewLabel}>Preview for volunteers</p>
      <div className={s.previewMedia}>
        <img src={foodImage({ title, category: values.category, photoUrl: values.photoUrl })} alt="" />
        <Badge tone="white" className={s.previewBadge}>
          About {mealText(values)}
        </Badge>
      </div>
      <div className={s.previewBody}>
        <h3 data-empty={!title || undefined}>
          <DietMark diet={values.diet} /> {title || 'Name of the food'}
        </h3>
        <p>{categoryLabel[values.category]}</p>
        <dl className={s.facts}>
          <div>
            <dt>Quantity</dt>
            <dd>
              {values.quantity} {unitLabel[values.unit]}
            </dd>
          </div>
          <div>
            <dt>Best before</dt>
            <dd>
              {values.bestBefore ? (
                <>
                  {dayTime(values.bestBefore)} <Countdown to={values.bestBefore} format="short" className={s.factTime} />
                </>
              ) : (
                'Not set'
              )}
            </dd>
          </div>
          <div>
            <dt>Pickup window</dt>
            <dd>{pickupWindow(values.pickupFrom, values.pickupUntil)}</dd>
          </div>
          <div>
            <dt>Pickup at</dt>
            <dd>{values.address || 'Not set'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function What({ form }: { form: PostForm }) {
  const { values, set, touch, error } = form;
  return (
    <>
      <Field
        label="Name"
        placeholder="Veg biryani"
        autoFocus
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        onBlur={() => touch('title')}
        error={error('title')}
      />
      <Segmented
        block
        label="Diet"
        value={values.diet}
        onChange={(v) => set('diet', v)}
        options={[
          { value: 'VEG', label: 'Veg' },
          { value: 'NON_VEG', label: 'Non-veg' },
        ]}
      />
      <div className={s.chips} role="group" aria-label="Category">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={values.category === c} onClick={() => set('category', c)}>
            {categoryLabel[c]}
          </Chip>
        ))}
      </div>
      <PhotoDrop url={values.photoUrl} onChange={(u) => set('photoUrl', u)} onUploading={form.setUploading} />
    </>
  );
}

function HowMuch({ form }: { form: PostForm }) {
  const { values, set, error } = form;
  const change = (n: number) => set('quantity', Math.max(1, Math.min(9999, n)));
  return (
    <>
      <div className={s.stepper}>
        <IconButton label="Less" onClick={() => change(values.quantity - 1)} disabled={values.quantity <= 1} className={s.stepBtn}>
          <Minus size={22} strokeWidth={2} />
        </IconButton>
        <label className={s.qty}>
          <span className="sr-only">Quantity</span>
          <input
            inputMode="numeric"
            value={values.quantity || ''}
            onChange={(e) => change(Number(e.target.value.replace(/\D/g, '')) || 0)}
            aria-invalid={!!error('quantity') || undefined}
          />
          <span>{unitLabel[values.unit]}</span>
        </label>
        <IconButton label="More" onClick={() => change(values.quantity + 1)} className={s.stepBtn}>
          <Plus size={22} strokeWidth={2} />
        </IconButton>
      </div>
      <Segmented
        block
        label="Unit"
        value={values.unit}
        onChange={(u) => set('unit', u)}
        options={UNITS.map((u) => ({ value: u, label: unitLabel[u][0]!.toUpperCase() + unitLabel[u].slice(1) }))}
      />
      <p className={s.hint}>About {mealText(values)}.</p>
    </>
  );
}

function Where({ form }: { form: PostForm }) {
  const { values, set, touch, error } = form;
  return (
    <>
      <Field
        label="Pickup address"
        value={values.address}
        onChange={(e) => set('address', e.target.value)}
        onBlur={() => touch('address')}
        error={error('address')}
      />
      <Field
        label="Note for the volunteer"
        multiline
        placeholder="Ask for Ravi at the back gate"
        value={values.note}
        onChange={(e) => set('note', e.target.value)}
        hint="Optional"
      />
    </>
  );
}

function Safety({ form }: { form: PostForm }) {
  const { values, set } = form;
  const toggle = (k: (typeof SAFETY)[number]['key'], on: boolean) =>
    set('checks', on ? [...values.checks, k] : values.checks.filter((x) => x !== k));
  return (
    <Group footer="All four are needed so kitchens can serve the food safely.">
      {SAFETY.map(({ key, label }) => (
        <Row key={key} title={label} chevron={false} trailing={<Toggle label={label} checked={values.checks.includes(key)} onChange={(on) => toggle(key, on)} />} />
      ))}
    </Group>
  );
}

function Review({ form }: { form: PostForm }) {
  const { values } = form;
  return (
    <>
      <p className={s.hint}>Check the preview, then post. Volunteers will see it as shown.</p>
      <Group>
        <Row
          title="Type"
          trailing={
            <span className={s.inline}>
              <DietMark diet={values.diet} /> {categoryLabel[values.category]}
            </span>
          }
        />
        <Row title="Best before" trailing={values.bestBefore ? dayTime(values.bestBefore) : 'Not set'} />
        <Row title="Pickup" trailing={pickupWindow(values.pickupFrom, values.pickupUntil)} />
        <Row title="Photo" trailing={values.photoUrl ? 'Added' : 'None'} />
      </Group>
    </>
  );
}
