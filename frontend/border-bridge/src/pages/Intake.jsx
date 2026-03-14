import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { createPerson, addCaseNote } from '../lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { intakeFormSchema } from '../types/formSchema';
import AudioRecorder from '../components/AudioRecorder';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Mic,
  Users,
  Heart,
  Shield,
} from 'lucide-react';

const steps = [
  { title: 'Core Identity', icon: Users, description: 'Basic personal information' },
  { title: 'The Narrative', icon: Mic, description: 'Voice-recorded story' },
  { title: 'Family & Relationships', icon: Heart, description: 'Family connections' },
  { title: 'Service Tracking', icon: Shield, description: 'Needs and status' },
];

function Intake() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();

  const requiredFieldsByStep = {
    0: ['fullName', 'nationality', 'preferredLanguage'],
  };

  const renderFieldLabel = (label, isRequired = false) => (
    <>
      {label}
      {isRequired && <span className="text-amber-600 font-semibold"> *</span>}
    </>
  );

  const isValuePresent = (value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return !Number.isNaN(value);
    }

    if (value && typeof value === 'object') {
      if (typeof value.value === 'string') {
        return value.value.trim().length > 0;
      }
      return Object.keys(value).length > 0;
    }

    return value != null;
  };

  const getFieldValue = (values, fieldPath) => {
    return fieldPath
      .split('.')
      .reduce((acc, key) => (acc == null ? undefined : acc[key]), values);
  };

  const form = useForm({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      fullName: '',
      nativeScriptNames: '',
      dateOfBirth: '',
      gender: 'Prefer not to say',
      nationality: '',
      preferredLanguage: '',
      voiceNarrative: '',
      translatedNarrative: '',
      isTravelingAlone: false,
      familyMembers: [],
      missingRelatives: [],
      urgentNeeds: [],
      initialScreeningStatus: true,
      vulnerabilityMarker: 'Low',
    },
  });

  const { fields: familyFields, append: appendFamily, remove: removeFamily } = useFieldArray({
    control: form.control,
    name: 'familyMembers',
  });

  const { fields: missingFields, append: appendMissing, remove: removeMissing } = useFieldArray({
    control: form.control,
    name: 'missingRelatives',
  });

  const currentStepRequiredFields = requiredFieldsByStep[currentStep] || [];
  const watchedFormValues = form.watch();
  const isCurrentStepReady =
    currentStepRequiredFields.length === 0
    || currentStepRequiredFields.every((fieldName) => {
      const fieldValue = getFieldValue(watchedFormValues, fieldName);
      return isValuePresent(fieldValue);
    });

  async function onSubmit(values) {
    setIsSubmitting(true);
    setSubmitError('');

    // Map frontend form fields → backend Person schema
    const genderMap = {
      'Male': 'MALE',
      'Female': 'FEMALE',
      'Non-binary': 'OTHER',
      'Prefer not to say': 'PREFER_NOT_TO_SAY',
    };

    const nameParts = values.fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';

    const urgentNeeds = values.urgentNeeds || [];
    const familyMembers = (values.familyMembers || []).map((m) => m.value).filter(Boolean);
    const missingRelatives = (values.missingRelatives || []).map((r) => r.value).filter(Boolean);

    const payload = {
      caseType: 'ASYLUM_SEEKER',
      firstName,
      lastName,
      dateOfBirth: values.dateOfBirth || undefined,
      gender: genderMap[values.gender] || 'PREFER_NOT_TO_SAY',
      nationality: values.nationality,
      originCountry: values.nationality,
      languages: values.preferredLanguage ? [values.preferredLanguage] : [],
      asylumNarrative: values.voiceNarrative || '',
      flags: {
        medicalEmergency: urgentNeeds.includes('Medical'),
        unaccompaniedMinor: values.isTravelingAlone && !values.dateOfBirth ? true : false,
        traffickingIndicator: false,
        asylumClaim: true,
        familySeparated: missingRelatives.length > 0,
      },
    };

    try {
      const data = await createPerson(payload);

      // Auto-create a structured case note with all intake details
      const noteLines = [];
      noteLines.push(`[INTAKE FORM SUBMISSION]`);
      if (values.nativeScriptNames) noteLines.push(`Native script name: ${values.nativeScriptNames}`);
      noteLines.push(`Traveling alone: ${values.isTravelingAlone ? 'Yes' : 'No'}`);
      noteLines.push(`Vulnerability marker: ${values.vulnerabilityMarker}`);
      if (urgentNeeds.length > 0) noteLines.push(`Urgent needs: ${urgentNeeds.join(', ')}`);
      if (familyMembers.length > 0) noteLines.push(`Family members present: ${familyMembers.join(', ')}`);
      if (missingRelatives.length > 0) noteLines.push(`Missing relatives: ${missingRelatives.join(', ')}`);
      if (values.translatedNarrative) noteLines.push(`Translated narrative: ${values.translatedNarrative}`);

      try {
        await addCaseNote(data.person._id, noteLines.join('\n'));
      } catch (noteErr) {
        console.warn('Case note auto-create failed:', noteErr.message);
      }

      navigate('/submitted', {
        state: { person: data.person, caseFile: data.caseFile },
      });
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit intake form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = async () => {
    const requiredFields = requiredFieldsByStep[currentStep] || [];

    if (requiredFields.length > 0) {
      const stepIsValid = await form.trigger(requiredFields);
      if (!stepIsValid) {
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();

    if (currentStep !== steps.length - 1) {
      return;
    }

    void form.handleSubmit(onSubmit)(event);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={index} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full ${isCompleted
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                      : isCurrent
                        ? 'bg-amber-200 text-slate-900 ring-2 ring-amber-400'
                        : 'bg-gray-200 text-gray-400'
                      }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-20 h-1 mx-1 rounded-full bg-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            {steps[currentStep].title}
          </h1>
          <p className="text-gray-600 text-center mt-2">
            {steps[currentStep].description}
          </p>



          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="bg-white rounded-lg shadow-lg p-8 mt-6">
              {submitError && (
                <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  {submitError}
                </div>
              )}
              {/* Step 1: Core Identity */}
              {currentStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Full Name', true)}</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nativeScriptNames"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Native Script Names')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Original language spelling" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Date of Birth / Estimated Age')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Gender')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Non-binary">Non-binary</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Nationality', true)}</FormLabel>
                        <FormControl>
                          <Input placeholder="Country of origin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preferredLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Preferred Language', true)}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="Arabic">Arabic</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="Swahili">Swahili</SelectItem>
                            <SelectItem value="Ukrainian">Ukrainian</SelectItem>
                            <SelectItem value="Russian">Russian</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Pashto">Pashto</SelectItem>
                            <SelectItem value="Dari">Dari</SelectItem>
                            <SelectItem value="Farsi">Farsi</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: The Narrative */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="voiceNarrative"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Refugee Narrative (Speech-to-Text)')}</FormLabel>
                        <FormControl>
                          <AudioRecorder
                            preferredLanguage={form.watch('preferredLanguage') || 'English'}
                            initialValue={field.value}
                            initialTranslation={form.watch('translatedNarrative')}
                            onTranscriptionUpdate={(text) => {
                              field.onChange(text);
                            }}
                            onTranslationUpdate={(text) => {
                              form.setValue('translatedNarrative', text);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Family & Relationships */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="isTravelingAlone"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{renderFieldLabel('Traveling Alone')}</FormLabel>
                          <p className="text-sm text-gray-500">
                            Check if you are not traveling with family members
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>{renderFieldLabel('Family Members Present')}</FormLabel>
                    {familyFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3 mt-2">
                        <Input
                          {...form.register(`familyMembers.${index}.value`)}
                          placeholder="Family member name"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFamily(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendFamily({ value: '' })}
                      className="mt-2 ml-2"
                    >
                      Add Family Member
                    </Button>
                  </div>

                  <div>
                    <FormLabel>{renderFieldLabel('Missing Relatives')}</FormLabel>
                    {missingFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3 mt-2">
                        <Input
                          {...form.register(`missingRelatives.${index}.value`)}
                          placeholder="Missing relative name"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMissing(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendMissing({ value: '' })}
                      className="mt-2 ml-2"
                    >
                      Add Missing Relative
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Service Tracking */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="urgentNeeds"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">{renderFieldLabel('Urgent Needs')}</FormLabel>
                          <p className="text-sm text-gray-500">Select all that apply</p>
                        </div>
                        {['Medical', 'Food', 'Shelter', 'Legal', 'Protection'].map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="urgentNeeds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item])
                                          : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item
                                            )
                                          )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {item}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vulnerabilityMarker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{renderFieldLabel('Vulnerability Marker')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vulnerability level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button
                    key="next-btn"
                    type="button"
                    variant="outline"
                    onClick={nextStep}
                    disabled={!isCurrentStepReady}
                    className="disabled:opacity-45 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    key="submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 px-6 font-semibold shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Intake Form'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default Intake;