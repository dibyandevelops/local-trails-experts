'use client';

export type VerificationDetailsValues = {
  yearsExperience: string;
  certifications: string;
  guidingHistory: string;
  safetyTraining: string;
  links: string;
};

type VerificationDetailsFormProps = {
  values: VerificationDetailsValues;
  onChange: (next: VerificationDetailsValues) => void;
  hideCertifications?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  textareaClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export default function VerificationDetailsForm({
  values,
  onChange,
  hideCertifications = false,
  containerClassName = 'rounded-lg border border-gray-200 bg-gray-50 p-4',
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
  inputClassName = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
  textareaClassName = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
  titleClassName = 'text-sm font-semibold text-gray-900 mb-2',
  descriptionClassName = 'text-xs text-gray-600 mb-3',
}: VerificationDetailsFormProps) {
  return (
    <div className={containerClassName}>
      <h3 className={titleClassName}>Verification Details</h3>
      <p className={descriptionClassName}>
        Add structured details to speed up admin verification.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>Years of experience</label>
          <input
            type="text"
            value={values.yearsExperience}
            onChange={(event) =>
              onChange({ ...values, yearsExperience: event.target.value })
            }
            className={inputClassName}
            placeholder="e.g., 6 years guiding MTB and trail runs"
          />
        </div>
        {!hideCertifications ? (
          <div>
            <label className={labelClassName}>Certifications</label>
            <input
              type="text"
              value={values.certifications}
              onChange={(event) =>
                onChange({ ...values, certifications: event.target.value })
              }
              className={inputClassName}
              placeholder="e.g., Wilderness First Aid, PMBI Level 1"
            />
          </div>
        ) : (
          // Certificates are optional; some flows hide this input for a simpler UX.
          <div className="hidden" aria-hidden="true" />
        )}
        <div className="md:col-span-2">
          <label className={labelClassName}>Guiding history</label>
          <textarea
            rows={3}
            value={values.guidingHistory}
            onChange={(event) =>
              onChange({ ...values, guidingHistory: event.target.value })
            }
            className={textareaClassName}
            placeholder="Notable trails/events, group size, and frequency."
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClassName}>Safety training & risk management</label>
          <textarea
            rows={3}
            value={values.safetyTraining}
            onChange={(event) =>
              onChange({ ...values, safetyTraining: event.target.value })
            }
            className={textareaClassName}
            placeholder="Emergency response skills, route safety process, risk checks."
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClassName}>Links / proof</label>
          <textarea
            rows={2}
            value={values.links}
            onChange={(event) => onChange({ ...values, links: event.target.value })}
            className={textareaClassName}
            placeholder="Strava, portfolio, race results, social profiles."
          />
        </div>
      </div>
    </div>
  );
}
