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
import { useT, type T } from '../../lib/i18n';
import type { Category, Unit } from '../../lib/types';
import { useDonorData } from './DonorData';
import { dayTime, mealsFor, pickupWindow } from './donorKit';
import AiAssist from './AiAssist';
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
const mealText = (v: { quantity: number; unit: Unit }, t: T) => {
  const n = mealsFor(v.quantity, v.unit);
  return t(n === 1 ? '{n} meal' : '{n} meals', { n });
};
const CATEGORIES = Object.keys(categoryLabel) as Category[];
const UNITS: Unit[] = ['SERVINGS', 'KG', 'PACKS'];

export default function PostFlow() {
  const { user } = useAuth();
  const { upsert } = useDonorData();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
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
      toast(t('Posted. Kitchens nearby can see it now.'));
      navigate('/donor', { replace: true });
    } else if (res.step !== undefined) setStep(res.step);
  };

  return (
    <Page className={s.page}>
      <Topbar
        title={t('Post food')}
        subtitle={t('Step {step} of {total}', { step: step + 1, total: STEPS.length })}
        actions={
          <Button variant="secondary" icon={<X size={18} strokeWidth={2} aria-hidden />} onClick={() => navigate('/donor')}>
            {t('Close')}
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
            <Progress value={(step + 1) / STEPS.length} label={t('Step {step} of {total}', { step: step + 1, total: STEPS.length })} />
          </div>
          <ol className={s.steps} aria-label={t('Steps')}>
            {STEP_NAMES.map((name, i) => {
              const dot = <span className={s.stepDot}>{i < step ? <Check size={13} strokeWidth={3} aria-hidden /> : i + 1}</span>;
              const label = <span className={s.stepName}>{t(name)}</span>;
              return (
                <li key={name} data-state={i < step ? 'done' : i === step ? 'current' : 'todo'}>
                  {i === step ? (
                    <span aria-current="step">
                      {dot}
                      {label}
                    </span>
                  ) : (
                    <button type="button" aria-label={t(name)} disabled={i > step} onClick={() => setStep(i)}>
                      {dot}
                      {label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          <div key={step} className={step === 2 ? `${s.step} ${s.stepWide}` : s.step}>
            <h2 className={s.question}>{t(STEPS[step]!)}</h2>
            {step === 0 && form.restored && (
              <p className={s.draft}>
                {t('We kept your last draft.')}{' '}
                <button type="button" onClick={form.discardDraft}>
                  {t('Start over')}
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
                {t('Back')}
              </Button>
            )}
            <Button type="submit" size="lg" className={s.grow} loading={form.submitting} disabled={step === last && !!blocker}>
              {t(step === last ? 'Post food' : 'Continue')}
            </Button>
          </footer>
        </form>

        <aside className={s.side} data-review={step === last || undefined}>
          <Preview form={form} />
          <Panel title={t('What happens next')} className={s.nextPanel}>
            <ol className={s.next}>
              {NEXT_UP.map((line, i) => (
                <li key={line}>
                  <span>{i + 1}</span>
                  {t(line)}
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
  const t = useT();
  const title = values.title.trim();
  return (
    <section className={s.previewCard} aria-label={t('Preview')}>
      <p className={s.previewLabel}>{t('Preview for volunteers')}</p>
      <div className={s.previewMedia}>
        <img src={foodImage({ title, category: values.category, photoUrl: values.photoUrl })} alt="" />
        <Badge tone="white" className={s.previewBadge}>
          {t('About {meals}', { meals: mealText(values, t) })}
        </Badge>
      </div>
      <div className={s.previewBody}>
        <h3 data-empty={!title || undefined}>
          <DietMark diet={values.diet} /> {title || t('Name of the food')}
        </h3>
        <p>{categoryLabel[values.category]}</p>
        <dl className={s.facts}>
          <div>
            <dt>{t('Quantity')}</dt>
            <dd>
              {values.quantity} {unitLabel[values.unit]}
            </dd>
          </div>
          <div>
            <dt>{t('Best before')}</dt>
            <dd>
              {values.bestBefore ? (
                <>
                  {dayTime(values.bestBefore, t)} <Countdown to={values.bestBefore} format="short" className={s.factTime} />
                </>
              ) : (
                t('Not set')
              )}
            </dd>
          </div>
          <div>
            <dt>{t('Pickup window')}</dt>
            <dd>{pickupWindow(values.pickupFrom, values.pickupUntil, t)}</dd>
          </div>
          <div>
            <dt>{t('Pickup at')}</dt>
            <dd>{values.address || t('Not set')}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function What({ form }: { form: PostForm }) {
  const { values, set, touch, error } = form;
  const t = useT();
  return (
    <>
      <Field
        label={t('Name')}
        placeholder="Veg biryani"
        autoFocus
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        onBlur={() => touch('title')}
        error={error('title')}
      />
      <Segmented
        block
        label={t('Diet')}
        value={values.diet}
        onChange={(v) => set('diet', v)}
        options={[
          { value: 'VEG', label: t('Veg') },
          { value: 'NON_VEG', label: t('Non-veg') },
        ]}
      />
      <div className={s.chips} role="group" aria-label={t('Category')}>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={values.category === c} onClick={() => set('category', c)}>
            {categoryLabel[c]}
          </Chip>
        ))}
      </div>
      <PhotoDrop url={values.photoUrl} onChange={(u) => set('photoUrl', u)} onUploading={form.setUploading} />
      <AiAssist photoUrl={values.photoUrl} uploading={form.uploading} onDraft={form.applyDraft} />
    </>
  );
}

function HowMuch({ form }: { form: PostForm }) {
  const { values, set, error } = form;
  const t = useT();
  const change = (n: number) => set('quantity', Math.max(1, Math.min(9999, n)));
  return (
    <>
      <div className={s.stepper}>
        <IconButton label={t('Less')} onClick={() => change(values.quantity - 1)} disabled={values.quantity <= 1} className={s.stepBtn}>
          <Minus size={22} strokeWidth={2} />
        </IconButton>
        <label className={s.qty}>
          <span className="sr-only">{t('Quantity')}</span>
          <input
            inputMode="numeric"
            value={values.quantity || ''}
            onChange={(e) => change(Number(e.target.value.replace(/\D/g, '')) || 0)}
            aria-invalid={!!error('quantity') || undefined}
          />
          <span>{unitLabel[values.unit]}</span>
        </label>
        <IconButton label={t('More')} onClick={() => change(values.quantity + 1)} className={s.stepBtn}>
          <Plus size={22} strokeWidth={2} />
        </IconButton>
      </div>
      <Segmented
        block
        label={t('Unit')}
        value={values.unit}
        onChange={(u) => set('unit', u)}
        options={UNITS.map((u) => ({ value: u, label: unitLabel[u][0]!.toUpperCase() + unitLabel[u].slice(1) }))}
      />
      <p className={s.hint}>{t('About {meals}', { meals: mealText(values, t) })}.</p>
    </>
  );
}

function Where({ form }: { form: PostForm }) {
  const { values, set, touch, error } = form;
  const t = useT();
  return (
    <>
      <Field
        label={t('Pickup address')}
        value={values.address}
        onChange={(e) => set('address', e.target.value)}
        onBlur={() => touch('address')}
        error={error('address')}
      />
      <Field
        label={t('Note for the volunteer')}
        multiline
        placeholder={t('Ask for Ravi at the back gate')}
        value={values.note}
        onChange={(e) => set('note', e.target.value)}
        hint={t('Optional')}
      />
    </>
  );
}

function Safety({ form }: { form: PostForm }) {
  const { values, set } = form;
  const t = useT();
  const toggle = (k: (typeof SAFETY)[number]['key'], on: boolean) =>
    set('checks', on ? [...values.checks, k] : values.checks.filter((x) => x !== k));
  return (
    <Group footer={t('All four are needed so kitchens can serve the food safely.')}>
      {SAFETY.map(({ key, label }) => (
        <Row key={key} title={t(label)} chevron={false} trailing={<Toggle label={t(label)} checked={values.checks.includes(key)} onChange={(on) => toggle(key, on)} />} />
      ))}
    </Group>
  );
}

function Review({ form }: { form: PostForm }) {
  const { values } = form;
  const t = useT();
  return (
    <>
      <p className={s.hint}>{t('Check the preview, then post. Volunteers will see it as shown.')}</p>
      <Group>
        <Row
          title={t('Type')}
          trailing={
            <span className={s.inline}>
              <DietMark diet={values.diet} /> {categoryLabel[values.category]}
            </span>
          }
        />
        <Row title={t('Best before')} trailing={values.bestBefore ? dayTime(values.bestBefore, t) : t('Not set')} />
        <Row title={t('Pickup')} trailing={pickupWindow(values.pickupFrom, values.pickupUntil, t)} />
        <Row title={t('Photo')} trailing={t(values.photoUrl ? 'Added' : 'None')} />
      </Group>
    </>
  );
}
