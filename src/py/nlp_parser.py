import sys
import os
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_ollama.llms import OllamaLLM

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer

import nltk

class JobApplication(BaseModel):
    employer: str = Field(description="the employer")
    jobTitle: str = Field(description="the job title")
    year: int = Field(description="the current year")
    generalRole: str = Field(description="the general role")
    jobLevel: str = Field(description="the general seniority level of the job")
    jobDescription: str = Field(description="the job description")

def generate_json(input, role_link):
    """
    Use LangChain to generate a structured JSON output based on the input prompt and role link.
    """

    # Initialize the ChatOpenAI model with custom endpoint
    # Parse the input text
    parser = PlaintextParser.from_string(input, Tokenizer("english"))

    # Create an LSA summarizer
    summarizer = LsaSummarizer()

    # Generate the summary
    # summary = summarizer(parser.document, sentences_count=30) # You can adjust the number 
    # input_summarised = ' '.join([str(sentence) for sentence in summary])
    input_summarised = input
    
    # print("Input summary",input_summarised)
    
    llm = OllamaLLM(model="llama3.2", base_url="https://llama.mattdh.me")
    
    parser = JsonOutputParser(pydantic_object=JobApplication)
    
    prompt = PromptTemplate(
        template="You are to produce your entire answer as valid JSON only. You must not include any additional commentary, explanations, or text outside of the JSON. The JSON object should match the following structure and field types exactly: \n{format_instructions} \n Turn this into JSON: {input_summarised}\n",
        input_variables=["input_summarised"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    # Create the LangChain LLMChain
    chain = prompt | llm | parser

    # Execute the chain and return the result
    ret_val = chain.invoke({"input_summarised": input_summarised})
    # print(ret_val)
    return ret_val

if __name__ == "__main__":
    nltk.download('punkt_tab')
  
    if len(sys.argv) < 3:
        print("Usage: python script.py <job_application_text> <role_link>")
        sys.exit(1)

    # Get input arguments
    job_application_text = sys.argv[1]
    role_link = sys.argv[2]
    
    # print("Generating JSON")

    # Generate JSON output
    json_output = generate_json(job_application_text, role_link)

    # Print the result
    if json_output:
        print(json_output)
    else:
        print("Failed to generate JSON output.")
        
    exit(0)
