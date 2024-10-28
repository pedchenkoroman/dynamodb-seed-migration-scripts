import { NodePlopAPI } from 'plop';

export default function (plop: NodePlopAPI) {
  plop.setGenerator('script', {
    description: 'Generate a basic script template',
    prompts: [
      {
        type: 'input',
        name: 'scriptName',
        message: 'Name of migration/seed script file.',
      },
      {
        type: 'input',
        name: 'folderName',
        message: 'Name of folder where the script will be placed.',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'scripts/{{folderName}}/{{scriptName}}.ts',
        templateFile: 'templates/migration.hbs',
      },
    ],
  });
}
