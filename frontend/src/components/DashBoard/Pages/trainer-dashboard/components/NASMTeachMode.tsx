/**
 * NASMTeachMode
 * Compact accordion renderer for the trainer assessment teach-mode guide.
 * Protocol copy is split by assessment type to keep this mounted component
 * focused on state and accessibility behavior.
 */
import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { TEACH_DATA } from './NASMTeachMode.data';
import {
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  AccordionLeft,
  ExpandBtn,
  ExpandControls,
  TeachContainer,
  TeachHeader,
  TeachTitle,
} from './NASMTeachMode.styles';

interface NASMTeachModeProps {
  assessmentType: string;
}

const NASMTeachMode = ({ assessmentType }: NASMTeachModeProps) => {
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const data = TEACH_DATA[assessmentType];

  if (!data) return null;

  const toggle = (index: number) => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    data.sections.forEach((_, index) => { all[index] = true; });
    setOpenSections(all);
  };

  return (
    <TeachContainer>
      <TeachHeader>
        <BookOpen size={20} aria-hidden="true" />
        <TeachTitle>{data.title}</TeachTitle>
        <ExpandControls>
          <ExpandBtn type="button" onClick={expandAll}>Expand All</ExpandBtn>
          <ExpandBtn type="button" onClick={() => setOpenSections({})}>Collapse All</ExpandBtn>
        </ExpandControls>
      </TeachHeader>

      {data.sections.map((section, index) => {
        const isOpen = !!openSections[index];
        return (
          <AccordionItem key={section.title}>
            <AccordionHeader type="button" onClick={() => toggle(index)} aria-expanded={isOpen}>
              <AccordionLeft>
                {section.icon}
                <span>{section.title}</span>
              </AccordionLeft>
              {isOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </AccordionHeader>
            {isOpen && <AccordionBody>{section.content}</AccordionBody>}
          </AccordionItem>
        );
      })}
    </TeachContainer>
  );
};

export default NASMTeachMode;
