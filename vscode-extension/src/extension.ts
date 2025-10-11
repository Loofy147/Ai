import * as vscode from 'vscode';
import axios from 'axios';

const GENERATE_URL = 'http://127.0.0.1:8000/generate';
const GENERATE_TEST_URL = 'http://127.0.0.1:8000/generate-test';

export function activate(context: vscode.ExtensionContext) {

    let explainCodeCommand = vscode.commands.registerCommand('my-assistant.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            if (selectedText) {
                try {
                    const response = await axios.post(GENERATE_URL, {
                        prompt: `Explain the following code:\n\n${selectedText}`
                    });
                    const feedback = await vscode.window.showInformationMessage(
                        response.data.response,
                        { modal: true },
                        "👍 Helpful",
                        "👎 Not Helpful"
                    );

                    // We will send the feedback to the backend in the next step.
                    if (feedback) {
                        axios.post('http://127.0.0.1:8000/feedback', {
                            playbook_uuid: response.data.playbook_uuid,
                            feedback: feedback
                        });
                        vscode.window.showInformationMessage(`Thank you for your feedback! (${feedback})`);
                    }

                } catch (error) {
                    vscode.window.showErrorMessage('Error communicating with the AI assistant.');
                    console.error(error);
                }
            }
        }
    });

    let generateCodeCommand = vscode.commands.registerCommand('my-assistant.generateCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            const userPrompt = await vscode.window.showInputBox({
                prompt: "Describe the code you want to generate"
            });

            if (userPrompt) {
                try {
                    const response = await axios.post(GENERATE_URL, {
                        prompt: `${userPrompt}\n\nHere is the relevant code snippet:\n\n${selectedText}`
                    });

                    editor.edit(editBuilder => {
                        editBuilder.replace(selection, response.data.response);
                    });

                    const feedback = await vscode.window.showInformationMessage(
                        "Was this code helpful?",
                        { modal: true },
                        "👍 Helpful",
                        "👎 Not Helpful"
                    );

                    // We will send the feedback to the backend in the next step.
                    if (feedback) {
                        axios.post('http://127.0.0.1:8000/feedback', {
                            playbook_uuid: response.data.playbook_uuid,
                            feedback: feedback
                        });
                        vscode.window.showInformationMessage(`Thank you for your feedback! (${feedback})`);
                    }

                } catch (error) {
                    vscode.window.showErrorMessage('Error communicating with the AI assistant.');
                    console.error(error);
                }
            }
        }
    });

    let generateTestCommand = vscode.commands.registerCommand('my-assistant.generateTest', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            if (selectedText) {
                const framework = await vscode.window.showInputBox({ prompt: "Enter testing framework (e.g., pytest, jest)" });
                if (framework) {
                    try {
                        const response = await axios.post(GENERATE_TEST_URL, {
                            code: selectedText,
                            testing_framework: framework
                        });

                        // Create a new file for the test
                        const newFile = await vscode.workspace.openTextDocument({
                            content: response.data.response,
                            language: 'python' // Or determine from framework
                        });
                        await vscode.window.showTextDocument(newFile);

                    } catch (error) {
                        vscode.window.showErrorMessage('Error generating test.');
                        console.error(error);
                    }
                }
            }
        }
    });

    context.subscriptions.push(explainCodeCommand, generateCodeCommand, generateTestCommand);
}

export function deactivate() {}
